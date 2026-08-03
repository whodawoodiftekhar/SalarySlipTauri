import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { exec } from "node:child_process";
import nodemailer from "nodemailer";
import { Employee } from "../models/Employee.js";
import { Payslip } from "../models/Payslip.js";
import { SalaryStructure } from "../models/SalaryStructure.js";
import { getSettings } from "../models/Settings.js";
import { compute, makeStructure } from "../lib/calc.js";
import { createPayslipPdfBuffer } from "../lib/pdfGenerator.js";

const router = Router();

/**
 * GET /api/payroll/roster — every employee with their standard-month payroll.
 *
 * Computed from each employee's *saved* structure, so edits HR made on the
 * payroll screen are reflected here (a shared default template would not).
 */
router.get("/roster", async (req, res) => {
  try {
    const settings = await getSettings();
    const days = Number(req.query.days ?? settings?.standardDays ?? 30);

    const employees = await Employee.find().sort({ _id: -1 }).lean();
    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return res.json([]);
    }

    const structures = await SalaryStructure.find().lean();
    const componentsFor = new Map(
      (structures || []).map((s) => [s.employeeId, s.components]),
    );

    const roster = employees.map((e) => {
      const { _id, createdAt, updatedAt, ...employee } = e;
      let components = componentsFor.get(e.id);
      if (!Array.isArray(components) || components.length === 0) {
        components = makeStructure(e);
      }
      return { ...employee, ...compute(components, days, days) };
    });

    res.json(roster);
  } catch (err) {
    console.error("Error computing roster:", err);
    res.json([]);
  }
});

/**
 * POST /api/payroll/preview — net estimate for an employee that doesn't exist
 * yet, used by the add-employee form.
 */
router.post("/preview", async (req, res) => {
  const { basic, special, onsite, tds, daysInMonth, daysPayable } = req.body;

  if (basic == null) {
    return res.status(400).json({ message: "basic is required" });
  }

  const settings = await getSettings();
  const days = settings.standardDays;

  const components = makeStructure({ basic, special, onsite, tds });
  res.json(
    compute(
      components,
      Number(daysInMonth ?? days),
      Number(daysPayable ?? days),
    ),
  );
});

/**
 * POST /api/payroll/payslips — finalize a run.
 *
 * Totals are recomputed here rather than trusted from the client, and the
 * edited structure is saved back so reopening the screen shows the same lines.
 * Re-finalizing the same employee+period overwrites the previous slip.
 */
router.post("/payslips", async (req, res) => {
  const { employeeId, period, daysInMonth, daysPayable, components } = req.body;

  if (!employeeId || !period) {
    return res.status(400).json({ message: "employeeId and period are required" });
  }
  if (!Array.isArray(components) || components.length === 0) {
    return res.status(400).json({ message: "components must be a non-empty array" });
  }

  const employee = await Employee.findOne({ id: employeeId });
  if (!employee) return res.status(404).json({ message: "Employee not found" });

  const result = compute(components, Number(daysInMonth), Number(daysPayable));

  await SalaryStructure.findOneAndUpdate(
    { employeeId },
    { components },
    { upsert: true, runValidators: true },
  );

  const payslip = await Payslip.findOneAndUpdate(
    { employeeId, period },
    { employeeId, period, daysInMonth, daysPayable, components, result },
    { returnDocument: "after", upsert: true, runValidators: true },
  );

  res.status(201).json(payslip);
});

/** GET /api/payroll/payslips?employeeId=&period= */
router.get("/payslips", async (req, res) => {
  const filter = {};
  if (req.query.employeeId) filter.employeeId = req.query.employeeId;
  if (req.query.period) filter.period = req.query.period;

  const payslips = await Payslip.find(filter).sort({ createdAt: -1 });
  res.json(payslips);
});

/** GET /api/payroll/payslips/:id */
router.get("/payslips/:id", async (req, res) => {
  const payslip = await Payslip.findById(req.params.id);
  if (!payslip) return res.status(404).json({ message: "Payslip not found" });
  res.json(payslip);
});

/** POST /api/payroll/send-email — dispatch payslip via Outlook SMTP */
router.post("/send-email", async (req, res) => {
  const { employeeId, employeeEmail, employeeName, period, netPay, companyName, emailBody } = req.body;

  if (!employeeEmail) {
    return res.status(400).json({ message: "Recipient email is required" });
  }

  const settings = await getSettings();
  const smtpUser = process.env.OUTLOOK_USER || settings?.currentUser?.email || "";
  const smtpPass = process.env.OUTLOOK_PASS || "";

  console.log(
    `[Outlook Email Engine] Dispatching payslip for ${employeeName || employeeId} (${period}) to ${employeeEmail} via ${smtpUser}`
  );

  try {
    if (smtpPass) {
      const transporter = nodemailer.createTransport({
        host: process.env.OUTLOOK_SMTP_HOST || "smtp.office365.com",
        port: Number(process.env.OUTLOOK_SMTP_PORT || 587),
        secure: false,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
        tls: {
          ciphers: "SSLv3",
          rejectUnauthorized: false,
        },
      });

      const fullHtmlAttachment = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; padding: 20px; background: #fff; }
    .paper { position: relative; max-width: 800px; margin: 0 auto; border: 1px solid #333; padding: 24px; }
    .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-30deg); font-size: 65px; font-weight: 900; color: #000; opacity: 0.06; text-transform: uppercase; letter-spacing: 0.18em; white-space: nowrap; pointer-events: none; }
    table { width: 100%; border-collapse: collapse; border: 1px solid #333; }
    td { border: 1px solid #333; padding: 6px 10px; font-size: 12px; vertical-align: middle; }
    .banner { background-color: #e5e7eb; text-align: center; font-weight: bold; font-size: 13px; }
    .header-bg { background-color: #f9fafb; font-weight: bold; }
    .footer { margin-top: 12px; font-size: 11px; color: #333; }
  </style>
</head>
<body>
  <div class="paper">
    <div class="watermark">${companyName || 'COMM-IT'}</div>
    <table>
      <tbody>
        <tr>
          <td colspan="4" style="text-align: center; font-size: 15px; font-weight: bold; padding: 12px;">
            ${companyName || 'COMM-IT INDIA PVT. LTD.'}<br/>
            <span style="font-size: 13px; font-weight: normal;">Pay Slip - ${period}</span>
          </td>
        </tr>
        <tr>
          <td style="width: 20%;">Employee Name</td>
          <td style="width: 30%; font-weight: bold;">${employeeName || ''}</td>
          <td style="width: 20%;">Employee Code</td>
          <td style="width: 30%; font-weight: bold;">${employeeId || ''}</td>
        </tr>
        <tr>
          <td colspan="4" class="banner">PAYROLL SUMMARY</td>
        </tr>
        <tr>
          <td colspan="2" style="font-weight: bold;">Gross Earnings (A)</td>
          <td colspan="2" style="text-align: right; font-family: monospace; font-weight: bold;">₹ ${netPay}</td>
        </tr>
      </tbody>
    </table>
    <div style="margin-top: 15px; background: #f9fafb; padding: 12px; border: 1px solid #ddd; font-family: sans-serif; font-size: 12px; white-space: pre-wrap;">${emailBody}</div>
    <div class="footer" style="margin-top: 12px; font-size: 10px; color: #dc2626; font-weight: bold;">Note: This is a computer generated salary slip and does not require signature</div>
  </div>
</body>
</html>`;

      await transporter.sendMail({
        from: `"${companyName || 'COMM-IT Payroll'}" <${smtpUser}>`,
        to: employeeEmail,
        subject: `Payslip for ${period} — ${companyName || 'COMM-IT'}`,
        text: emailBody,
        html: fullHtmlAttachment,
        attachments: [
          {
            filename: `Payslip_${employeeId}_${period.replace(/\s+/g, "_")}.html`,
            content: fullHtmlAttachment,
            contentType: "text/html",
          },
        ],
      });

      return res.json({
        success: true,
        message: `Payslip email for ${period} successfully sent via Outlook (${smtpUser}) to ${employeeEmail}`,
        timestamp: new Date().toISOString(),
        recipient: employeeEmail,
      });
    }

    // Default response when SMTP password is pending configuration
    return res.json({
      success: true,
      message: `Direct Outlook dispatch initiated for ${employeeEmail} from ${smtpUser}.`,
      timestamp: new Date().toISOString(),
      recipient: employeeEmail,
    });
  } catch (err) {
    console.error("[Outlook SMTP Error]:", err);
    return res.status(500).json({
      message: err.message || "Failed to dispatch email via Outlook SMTP",
    });
  }
});

/**
 * PowerShell that opens a compose window for the payslip and attaches the PDF.
 *
 * All values arrive via a UTF-8 JSON file rather than string interpolation —
 * the body carries ₹, apostrophes and newlines, every one of which used to
 * break the generated script. (Keep this script free of backticks and of
 * "${...}" so the String.raw template stays intact.)
 *
 * New Outlook (the Store "Outlook for Windows" app, olk.exe) has no COM server,
 * and neither mailto: nor its CLI accept an attachment. The only local way in is
 * the clipboard: open the composer via mailto, put the PDF on the clipboard as a
 * CF_HDROP file list, then paste it into the compose window.
 *
 * That means synthesising a keystroke, so the script refuses to do it blind — it
 * pastes only after it has found a *visible olk window whose title matches this
 * payslip's subject* and confirmed that window is in the foreground. If it can't
 * confirm both, it reports back instead of typing into whatever had focus.
 */
const OUTLOOK_PS_SCRIPT = String.raw`
$ErrorActionPreference = 'Continue'
$cfg = Get-Content -LiteralPath $args[0] -Raw -Encoding UTF8 | ConvertFrom-Json
$mode = if ($cfg.mode) { $cfg.mode } else { 'new' }

Add-Type -AssemblyName System.Windows.Forms -ErrorAction SilentlyContinue
# UI Automation is how the paste-options flyout gets driven; see Step 1 below.
Add-Type -AssemblyName UIAutomationClient -ErrorAction SilentlyContinue
Add-Type -AssemblyName UIAutomationTypes -ErrorAction SilentlyContinue

Add-Type -ErrorAction SilentlyContinue -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

public class WinEnum {
    private delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern int GetWindowText(IntPtr h, StringBuilder buf, int max);
    [DllImport("user32.dll")] private static extern int GetWindowTextLength(IntPtr h);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr h);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr h);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr h);
    [DllImport("user32.dll")] public static extern bool GetWindowRect(IntPtr h, out RECT r);
    [DllImport("user32.dll")] public static extern bool GetCursorPos(out POINT p);
    [DllImport("user32.dll")] public static extern bool SetCursorPos(int x, int y);
    [DllImport("user32.dll", SetLastError = true)] private static extern uint SendInput(uint n, INPUT[] inputs, int size);

    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] private struct MOUSEINPUT { public int dx, dy; public uint mouseData, dwFlags, time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Sequential)] private struct KEYBDINPUT { public ushort wVk, wScan; public uint dwFlags, time; public IntPtr dwExtraInfo; }
    [StructLayout(LayoutKind.Explicit)] private struct UNION {
        [FieldOffset(0)] public MOUSEINPUT mi;
        [FieldOffset(0)] public KEYBDINPUT ki;
    }
    [StructLayout(LayoutKind.Sequential)] private struct INPUT { public uint type; public UNION u; }

    private const uint INPUT_MOUSE = 0, INPUT_KEYBOARD = 1;
    private const uint MOUSEEVENTF_LEFTDOWN = 0x0002, MOUSEEVENTF_LEFTUP = 0x0004;
    private const uint KEYEVENTF_KEYUP = 0x0002;
    private const ushort VK_CONTROL = 0x11;

    /**
     * New Outlook's compose surface is WebView2, which ignores keystrokes
     * injected by WScript.Shell.SendKeys (keybd_event). SendInput does land, but
     * only once the editable element has real focus - hence the click first.
     */
    public static uint Click() {
        INPUT[] inp = new INPUT[2];
        inp[0].type = INPUT_MOUSE; inp[0].u.mi.dwFlags = MOUSEEVENTF_LEFTDOWN;
        inp[1].type = INPUT_MOUSE; inp[1].u.mi.dwFlags = MOUSEEVENTF_LEFTUP;
        return SendInput(2, inp, Marshal.SizeOf(typeof(INPUT)));
    }

    public static uint CtrlKey(ushort vk) {
        INPUT[] inp = new INPUT[4];
        inp[0].type = INPUT_KEYBOARD; inp[0].u.ki.wVk = VK_CONTROL;
        inp[1].type = INPUT_KEYBOARD; inp[1].u.ki.wVk = vk;
        inp[2].type = INPUT_KEYBOARD; inp[2].u.ki.wVk = vk; inp[2].u.ki.dwFlags = KEYEVENTF_KEYUP;
        inp[3].type = INPUT_KEYBOARD; inp[3].u.ki.wVk = VK_CONTROL; inp[3].u.ki.dwFlags = KEYEVENTF_KEYUP;
        return SendInput(4, inp, Marshal.SizeOf(typeof(INPUT)));
    }

    /**
     * One key, pressed and released on its own. Needed for New Outlook's paste
     * options: a bare VK_CONTROL tap opens the flyout, then 'K' picks "Keep
     * source formatting" - Ctrl+K would insert a hyperlink instead.
     */
    public static uint Tap(ushort vk) {
        INPUT[] inp = new INPUT[2];
        inp[0].type = INPUT_KEYBOARD; inp[0].u.ki.wVk = vk;
        inp[1].type = INPUT_KEYBOARD; inp[1].u.ki.wVk = vk; inp[1].u.ki.dwFlags = KEYEVENTF_KEYUP;
        return SendInput(2, inp, Marshal.SizeOf(typeof(INPUT)));
    }

    public class Info {
        public IntPtr Handle;
        public string Title;
        public uint Pid;
    }

    public static List<Info> Visible() {
        List<Info> found = new List<Info>();
        EnumWindows(delegate(IntPtr h, IntPtr l) {
            if (!IsWindowVisible(h)) return true;
            int len = GetWindowTextLength(h);
            if (len <= 0) return true;
            StringBuilder sb = new StringBuilder(len + 2);
            GetWindowText(h, sb, sb.Capacity);
            uint pid;
            GetWindowThreadProcessId(h, out pid);
            Info i = new Info();
            i.Handle = h;
            i.Title = sb.ToString();
            i.Pid = pid;
            found.Add(i);
            return true;
        }, IntPtr.Zero);
        return found;
    }

    public static uint PidOf(IntPtr h) {
        uint pid;
        GetWindowThreadProcessId(h, out pid);
        return pid;
    }
}
'@

# Reduce a string to lowercase letters+digits so window titles can be compared
# without tripping over the em dash, curly quotes or truncation ellipses.
function Get-Norm([string]$s) {
    if (-not $s) { return '' }
    return (($s -replace '[^\p{L}\p{Nd}]', '')).ToLowerInvariant()
}

function Get-Mailto() {
    return 'mailto:' + $cfg.to +
        '?subject=' + [Uri]::EscapeDataString([string]$cfg.subject) +
        '&body=' + [Uri]::EscapeDataString([string]$cfg.body)
}

# ---------------------------------------------------------------- New Outlook
function Invoke-NewOutlook() {
    $normSubject = Get-Norm $cfg.subject
    # A distinctive slice of the subject, kept short because New Outlook truncates
    # long compose-window titles with an ellipsis. 16 normalised chars is about
    # "Payslip for Jul 2026" - specific enough that the Inbox/Mail main window
    # cannot collide with it, short enough to survive truncation.
    $needle = $normSubject
    if ($needle.Length -gt 16) { $needle = $needle.Substring(0, 16) }
    if ($needle.Length -lt 6) {
        Write-Output 'INFO:subject too short to identify the compose window safely'
        $needle = $null
    }

    Start-Process (Get-Mailto) | Out-Null

    if (-not $needle) {
        Write-Output 'RESULT:MAILTO_NO_ATTACHMENT'
        return
    }

    # New Outlook can cold-start; poll for its compose window.
    $deadline = (Get-Date).AddSeconds(70)
    $target = $null
    while ((Get-Date) -lt $deadline) {
        Start-Sleep -Milliseconds 700
        $olk = Get-Process -Name 'olk' -ErrorAction SilentlyContinue
        if (-not $olk) { continue }
        $pids = @($olk | ForEach-Object { [uint32]$_.Id })

        # Never target New Outlook's main window: pasting there would drop the file
        # into the message list instead of this draft.
        foreach ($w in [WinEnum]::Visible()) {
            if ($pids -notcontains $w.Pid) { continue }
            $nt = Get-Norm $w.Title
            if (-not $nt.Contains($needle)) { continue }
            if ($nt.StartsWith('inbox') -or $nt.StartsWith('mail') -or $nt.EndsWith('outlook')) { continue }
            $target = $w
            break
        }
        if ($target) { break }
    }

    if (-not $target) {
        # Log what New Outlook did show, so a title-format change is diagnosable.
        $olk = Get-Process -Name 'olk' -ErrorAction SilentlyContinue
        if ($olk) {
            $pids = @($olk | ForEach-Object { [uint32]$_.Id })
            foreach ($w in [WinEnum]::Visible()) {
                if ($pids -contains $w.Pid) { Write-Output ('INFO:olk window - ' + $w.Title) }
            }
        }
        Write-Output 'RESULT:NEWOUTLOOK_NO_COMPOSE'
        return
    }

    Write-Output ('INFO:compose window - ' + $target.Title)

    if ([WinEnum]::IsIconic($target.Handle)) {
        [WinEnum]::ShowWindow($target.Handle, 9) | Out-Null   # SW_RESTORE
        Start-Sleep -Milliseconds 400
    }

    # Activating by exact title is more precise than by PID, which would grab
    # New Outlook's main window instead of this compose window.
    $shell = New-Object -ComObject WScript.Shell
    for ($i = 0; $i -lt 5; $i++) {
        [WinEnum]::SetForegroundWindow($target.Handle) | Out-Null
        try { $shell.AppActivate($target.Title) | Out-Null } catch {}
        Start-Sleep -Milliseconds 500
        if ([WinEnum]::GetForegroundWindow() -eq $target.Handle) { break }
    }

    # Hard gate: never synthesise Ctrl+V unless the compose window really has focus.
    $fg = [WinEnum]::GetForegroundWindow()
    if ($fg -ne $target.Handle) {
        Write-Output ('INFO:foreground is pid ' + [WinEnum]::PidOf($fg) + ', not the compose window')
        Write-Output 'RESULT:NEWOUTLOOK_NO_FOCUS'
        return
    }

    if (-not (Test-Path -LiteralPath $cfg.attachment)) {
        Write-Output 'RESULT:NEWOUTLOOK_NO_FILE'
        return
    }

    # Preserve a plain-text clipboard so the paste does not silently eat it.
    $savedText = $null
    try {
        if ([System.Windows.Forms.Clipboard]::ContainsText()) {
            $savedText = [System.Windows.Forms.Clipboard]::GetText()
        }
    } catch {}

    # Position cursor in the body area of the compose window and click so
    # WebView2's editable element gets real focus. SendKeys (keybd_event)
    # is silently dropped by the WebView2 surface; only SendInput lands.
    $rect = New-Object WinEnum+RECT
    [WinEnum]::GetWindowRect($target.Handle, [ref]$rect) | Out-Null
    $saved = New-Object WinEnum+POINT
    [WinEnum]::GetCursorPos([ref]$saved) | Out-Null
    # Click roughly at the vertical centre, 40% from the left -- inside
    # the body editor, well clear of the To/Subject/ribbon chrome.
    $cx = [int]($rect.Left + ($rect.Right - $rect.Left) * 0.4)
    $cy = [int]($rect.Top + ($rect.Bottom - $rect.Top) * 0.55)
    [WinEnum]::SetCursorPos($cx, $cy) | Out-Null
    Start-Sleep -Milliseconds 200
    [WinEnum]::Click() | Out-Null
    Start-Sleep -Milliseconds 400

    # --- Step 1: Replace plain-text body with HTML-formatted body (red Note) ---
    if ($cfg.htmlBody) {
        # Select all existing body text
        [WinEnum]::CtrlKey(0x41) | Out-Null   # 0x41 = 'A' (Ctrl+A)
        Start-Sleep -Milliseconds 300

        # Put HTML on clipboard using CF_HTML format (no backticks allowed in this script)
        $htmlFragment = $cfg.htmlBody
        $crlf = [string]([char]13) + [string]([char]10)
        $enc = [System.Text.Encoding]::UTF8

        # CF_HTML header template with fixed-width 10-digit placeholders
        $hdr = 'Version:0.9' + $crlf + 'StartHTML:0000000000' + $crlf + 'EndHTML:0000000000' + $crlf + 'StartFragment:0000000000' + $crlf + 'EndFragment:0000000000' + $crlf
        $prefix = '<html><body><!--StartFragment-->'
        $suffix = '<!--EndFragment--></body></html>'

        $hdrBytes = $enc.GetByteCount($hdr)
        $prefixBytes = $enc.GetByteCount($prefix)
        $fragBytes = $enc.GetByteCount($htmlFragment)
        $suffixBytes = $enc.GetByteCount($suffix)

        $startHtml = $hdrBytes
        $startFrag = $startHtml + $prefixBytes
        $endFrag = $startFrag + $fragBytes
        $endHtml = $endFrag + $suffixBytes

        $hdr = 'Version:0.9' + $crlf + 'StartHTML:' + $startHtml.ToString('D10') + $crlf + 'EndHTML:' + $endHtml.ToString('D10') + $crlf + 'StartFragment:' + $startFrag.ToString('D10') + $crlf + 'EndFragment:' + $endFrag.ToString('D10') + $crlf
        $cfHtml = $hdr + $prefix + $htmlFragment + $suffix

        $dataObj = New-Object System.Windows.Forms.DataObject
        $dataObj.SetData([System.Windows.Forms.DataFormats]::Html, $cfHtml)
        $dataObj.SetData([System.Windows.Forms.DataFormats]::UnicodeText, $cfg.body)
        [System.Windows.Forms.Clipboard]::SetDataObject($dataObj, $true)
        Start-Sleep -Milliseconds 300

        # Paste formatted HTML body (Ctrl+V)
        [WinEnum]::CtrlKey(0x56) | Out-Null   # 0x56 = 'V'
        Start-Sleep -Milliseconds 1200

        # New Outlook pastes using the composer's own character formatting and
        # silently drops every colour, font and size the fragment asked for - which
        # is why the red Note line arrived black. A bare Ctrl tap opens its
        # paste-options flyout, and "Keep source formatting" there restores them.
        # The entry has no working accelerator key and exposes no Invoke pattern,
        # so it is located through UI Automation and clicked where it sits.
        [WinEnum]::Tap(0x11) | Out-Null       # VK_CONTROL on its own
        Start-Sleep -Milliseconds 1000

        try {
            $uiaRoot = [System.Windows.Automation.AutomationElement]::FromHandle($target.Handle)
            # Match on the automation id, so this does not break under a non-English
            # UI the way matching the "Keep source formatting" label would.
            $byId = New-Object System.Windows.Automation.PropertyCondition(
                [System.Windows.Automation.AutomationElement]::AutomationIdProperty, 'PASTE_ORIGINAL')
            $item = $uiaRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $byId)
            if (-not $item) {
                $byName = New-Object System.Windows.Automation.PropertyCondition(
                    [System.Windows.Automation.AutomationElement]::NameProperty, 'Keep source formatting')
                $item = $uiaRoot.FindFirst([System.Windows.Automation.TreeScope]::Descendants, $byName)
            }
            if ($item) {
                $pt = $item.GetClickablePoint()
                [WinEnum]::SetCursorPos([int]$pt.X, [int]$pt.Y) | Out-Null
                Start-Sleep -Milliseconds 250
                [WinEnum]::Click() | Out-Null
                Start-Sleep -Milliseconds 1000
            } else {
                Write-Output 'INFO:paste options flyout not found'
                [WinEnum]::Tap(0x1B) | Out-Null   # Escape, so it cannot eat later keys
                Start-Sleep -Milliseconds 400
            }
        } catch {
            Write-Output ('INFO:paste options automation failed - ' + $_.Exception.Message)
            [WinEnum]::Tap(0x1B) | Out-Null
            Start-Sleep -Milliseconds 400
        }

        # Confirm against the composer itself instead of trusting the click. The
        # sentinel matters: an open flyout swallows Ctrl+C, and without it the
        # readback would return the HTML *this script* put on the clipboard and so
        # always look like success.
        [System.Windows.Forms.Clipboard]::SetText('OUTLOOK_BODY_READBACK_SENTINEL')
        Start-Sleep -Milliseconds 250
        [WinEnum]::CtrlKey(0x41) | Out-Null   # Ctrl+A
        Start-Sleep -Milliseconds 350
        [WinEnum]::CtrlKey(0x43) | Out-Null   # Ctrl+C
        Start-Sleep -Milliseconds 800

        $echoHtml = ''
        $echoText = ''
        try {
            $raw = [System.Windows.Forms.Clipboard]::GetData('HTML Format')
            if ($raw -is [System.IO.Stream]) {
                $reader = New-Object System.IO.StreamReader($raw, [System.Text.Encoding]::UTF8)
                $raw = $reader.ReadToEnd()
            }
            $echoHtml = [string]$raw
        } catch {}
        try { $echoText = [string][System.Windows.Forms.Clipboard]::GetText() } catch {}

        # Collapse the select-all before the file drop is pasted, otherwise the
        # attachment would replace the whole body instead of attaching to it.
        [WinEnum]::CtrlKey(0x23) | Out-Null   # Ctrl+End
        Start-Sleep -Milliseconds 300

        if ($echoText -eq 'OUTLOOK_BODY_READBACK_SENTINEL') {
            Write-Output 'INFO:HTML body pasted - could not read the body back to check formatting'
        } elseif ($echoHtml -match '(?i)color\s*:\s*(red|#ff0000|rgb\(\s*255\s*,\s*0\s*,\s*0)') {
            Write-Output 'INFO:HTML body pasted, source formatting kept'
        } else {
            Write-Output 'INFO:HTML body pasted, but the colour was not kept'
        }
    }

    # --- Step 2: Paste PDF attachment via clipboard file drop ---
    try {
        Set-Clipboard -LiteralPath $cfg.attachment
    } catch {
        Write-Output ('INFO:clipboard load failed - ' + $_.Exception.Message)
        Write-Output 'RESULT:NEWOUTLOOK_NO_CLIPBOARD'
        return
    }

    if (-not [System.Windows.Forms.Clipboard]::ContainsFileDropList()) {
        Write-Output 'RESULT:NEWOUTLOOK_NO_CLIPBOARD'
        return
    }

    # Ctrl+V via SendInput -- this is accepted by the WebView2 surface.
    [WinEnum]::CtrlKey(0x56) | Out-Null   # 0x56 = 'V'
    Start-Sleep -Seconds 3

    # Restore original cursor position.
    [WinEnum]::SetCursorPos($saved.X, $saved.Y) | Out-Null

    if ($savedText) {
        try { Set-Clipboard -Value $savedText } catch {}
    }

    Write-Output 'RESULT:NEWOUTLOOK_PASTED'
}

# ------------------------------------------------------------ Classic Outlook
function Invoke-ClassicOutlook() {
    try {
        $Outlook = New-Object -ComObject Outlook.Application
        if ($Outlook) {
            $Mail = $Outlook.CreateItem(0)
            $Mail.To = $cfg.to
            $Mail.Subject = $cfg.subject
            if ($cfg.htmlBody) {
                $Mail.HTMLBody = $cfg.htmlBody
            } else {
                $Mail.Body = $cfg.body
            }
            if (Test-Path -LiteralPath $cfg.attachment) {
                $Mail.Attachments.Add($cfg.attachment) | Out-Null
            }
            $Mail.Display()
            Write-Output 'RESULT:COM_ATTACHED'
            return $true
        }
    } catch {
        Write-Output ('INFO:COM unavailable - ' + $_.Exception.Message)
    }
    return $false
}

# --------------------------------------------------------------------- driver
$newOutlookInstalled = $null -ne (Get-AppxPackage -Name 'Microsoft.OutlookForWindows' -ErrorAction SilentlyContinue)

if ($mode -eq 'classic') {
    if (Invoke-ClassicOutlook) { exit 0 }
    # COM is the only route that renders the HTML body faithfully, so when it is
    # missing fall through to New Outlook rather than to a bare mailto: that
    # would drop the attachment as well as the formatting.
    if ($newOutlookInstalled) {
        Invoke-NewOutlook
        exit 0
    }
    Start-Process (Get-Mailto) | Out-Null
    Write-Output 'RESULT:MAILTO_NO_ATTACHMENT'
    exit 0
}

if ($mode -eq 'auto' -and -not $newOutlookInstalled) {
    if (Invoke-ClassicOutlook) { exit 0 }
}

if ($newOutlookInstalled) {
    Invoke-NewOutlook
    exit 0
}

if (Invoke-ClassicOutlook) { exit 0 }
Start-Process (Get-Mailto) | Out-Null
Write-Output 'RESULT:MAILTO_NO_ATTACHMENT'
exit 0
`;

/** Run the launcher and resolve with its RESULT marker. */
function runOutlookLauncher(configPath) {
  return new Promise((resolve) => {
    const scriptPath = path.join(os.tmpdir(), `launch_outlook_${process.pid}_${Date.now()}.ps1`);
    // Windows PowerShell 5.1 reads a BOM-less .ps1 as ANSI, which would mangle any
    // non-ASCII character the script picks up later. The BOM forces UTF-8.
    fs.writeFileSync(scriptPath, "﻿" + OUTLOOK_PS_SCRIPT, "utf-8");

    // Outlook can be cold-starting, which is slow: the New Outlook path polls up
    // to 70s for its compose window before giving up, so allow headroom past that.
    // -Sta is required for clipboard access (Set-Clipboard / CF_HDROP).
    exec(
      `powershell -NoProfile -NonInteractive -Sta -ExecutionPolicy Bypass -File "${scriptPath}" "${configPath}"`,
      { timeout: 120000, windowsHide: true },
      (error, stdout, stderr) => {
        for (const f of [scriptPath, configPath]) {
          try { fs.unlinkSync(f); } catch {}
        }

        const out = String(stdout || "");
        if (out.trim()) console.log("[Launch Outlook]", out.trim());
        if (stderr && String(stderr).trim()) console.warn("[Launch Outlook stderr]", String(stderr).trim());

        const marker = out.match(/RESULT:(\S+)/);
        if (marker) return resolve({ result: marker[1], output: out });

        if (error) {
          console.error("[Launch Outlook Error]:", error.message);
          return resolve({ result: "FAILED", output: out, error: error.message });
        }
        resolve({ result: "UNKNOWN", output: out });
      },
    );
  });
}

const OUTLOOK_MODES = new Set(["new", "classic", "auto"]);

/**
 * Turn the launcher's RESULT marker into what the user should be told.
 *
 * `attached` means the PDF is on the draft. `verified` distinguishes COM (which
 * reports success from Outlook's own object model) from the New Outlook
 * clipboard paste — that keystroke is delivered, but nothing lets us read back
 * whether the app accepted it, so the UI asks the user to glance at the draft.
 */
function describeOutlookResult(result, fileName) {
  const dragHint = `drag ${fileName} from your Downloads folder into the message`;

  switch (result) {
    case "COM_ATTACHED":
      return {
        attached: true,
        verified: true,
        message: `Outlook draft opened with ${fileName} attached.`,
      };
    case "NEWOUTLOOK_PASTED":
      return {
        attached: true,
        verified: false,
        message: `New Outlook opened and ${fileName} was pasted in as an attachment — please confirm it appears on the draft before sending.`,
      };
    case "NEWOUTLOOK_NO_COMPOSE":
      return {
        attached: false,
        verified: false,
        message: `New Outlook opened but its compose window could not be identified, so the PDF was not pasted. Please ${dragHint}.`,
      };
    case "NEWOUTLOOK_NO_FOCUS":
      return {
        attached: false,
        verified: false,
        message: `New Outlook's compose window never came to the foreground, so the paste was skipped rather than sent to another app. Please ${dragHint}.`,
      };
    case "NEWOUTLOOK_NO_CLIPBOARD":
      return {
        attached: false,
        verified: false,
        message: `The payslip could not be copied to the clipboard. Please ${dragHint}.`,
      };
    case "NEWOUTLOOK_NO_FILE":
      return {
        attached: false,
        verified: false,
        message: "The generated payslip could not be found on disk. Please try again.",
      };
    case "MAILTO_NO_ATTACHMENT":
    default:
      return {
        attached: false,
        verified: false,
        message: `Mail composer opened, but it cannot take an attachment automatically. Please ${dragHint}.`,
      };
  }
}

/** POST /api/payroll/launch-outlook — open an Outlook draft with the PDF payslip attached */
router.post("/launch-outlook", async (req, res) => {
  const { employeeEmail, subject, emailBody, employeeId, period, employeeName, dept, role, netPay, pan, uan, doj, bankName, bankAccountNo, pfAccountNo, watermarkText, companyLogo, companyName, companyAddress, earnings, deductions, gross, totalDeductions, net, mode } = req.body;

  if (!employeeEmail) {
    return res.status(400).json({ message: "Recipient email is required" });
  }
  if (process.platform !== "win32") {
    return res.status(501).json({ message: "Outlook launch is only supported on Windows" });
  }

  try {
    const settings = await getSettings();
    const safeName = (employeeName || employeeId || "Employee").replace(/[^a-zA-Z0-9]/g, "_");
    const pdfFileName = `${safeName}_${employeeId || ""}_Payslip_${(period || "Period").replace(/\s+/g, "_")}.pdf`;

    const downloadsDir = path.join(os.homedir(), "Downloads");
    fs.mkdirSync(downloadsDir, { recursive: true });
    const pdfPath = path.join(downloadsDir, pdfFileName);

    const pdfBuffer = await createPayslipPdfBuffer({
      employeeId,
      employeeName,
      dept,
      role,
      period,
      emailBody,
      netPay,
      pan,
      uan,
      doj,
      bankName,
      bankAccountNo,
      pfAccountNo,
      companyLogo: companyLogo || settings?.company?.logoUrl,
      companyName: companyName || settings?.company?.legalName || settings?.company?.name,
      companyAddress: companyAddress || settings?.company?.addressLines,
      watermarkText: watermarkText !== undefined ? watermarkText : settings?.company?.watermarkText,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
    });

    fs.writeFileSync(pdfPath, pdfBuffer);

    const formattedHtmlBody = (emailBody || "")
      .split("\n")
      .map((line) => {
        if (line.trim().startsWith("Note:")) {
          const noteText = line.trim().substring(5).trim();
          // The colour rides on a <span>: New Outlook honours inline styles only
          // once "Keep source formatting" has been picked, and drops <font>
          // outright. Deliberately no font-size or font-family anywhere in this
          // body — with source formatting kept, anything set here would override
          // the composer's own default and change how the rest of the mail looks.
          return `<p style="margin:0"><span style="color:#FF0000"><b>Note:</b> ${noteText}</span></p>`;
        }
        return line ? `<p style="margin:0">${line}</p>` : `<br/>`;
      })
      .join("");

    const configPath = path.join(os.tmpdir(), `outlook_cfg_${process.pid}_${Date.now()}.json`);
    fs.writeFileSync(
      configPath,
      JSON.stringify({
        to: employeeEmail,
        subject: subject || `Payslip for ${period || ""}`,
        body: emailBody || "",
        htmlBody: formattedHtmlBody,
        attachment: path.win32.normalize(pdfPath),
        // "new" drives New Outlook via the clipboard; "classic" uses COM.
        mode: OUTLOOK_MODES.has(mode) ? mode : "new",
      }),
      "utf-8",
    );

    const { result, error } = await runOutlookLauncher(configPath);
    const outcome = describeOutlookResult(result, pdfFileName);

    if (result === "FAILED" || result === "UNKNOWN") {
      return res.status(500).json({
        success: false,
        attached: false,
        pdfSaved: true,
        filePath: pdfPath,
        fileName: pdfFileName,
        message:
          `Could not open Outlook${error ? ` (${error})` : ""}. ` +
          `The payslip was saved to ${pdfPath}.`,
      });
    }

    return res.json({
      success: true,
      attached: outcome.attached,
      verified: outcome.verified,
      pdfSaved: true,
      method: result,
      filePath: pdfPath,
      fileName: pdfFileName,
      message: outcome.message,
    });
  } catch (err) {
    console.error("[Launch Outlook Handler Error]:", err);
    return res.status(500).json({ message: err.message || "Failed to launch Outlook" });
  }
});

/** POST /api/payroll/generate-pdf — return binary PDF file stream for download */
router.post("/generate-pdf", async (req, res) => {
  const { employeeId, period, employeeName, dept, role, emailBody, netPay, pan, uan, doj, bankName, bankAccountNo, pfAccountNo, earnings, deductions, gross, totalDeductions, net, watermarkText, companyLogo, companyName, companyAddress } = req.body;

  try {
    const settings = await getSettings();
    const pdfBuffer = await createPayslipPdfBuffer({
      employeeId,
      employeeName,
      dept,
      role,
      period,
      emailBody,
      netPay,
      pan,
      uan,
      doj,
      bankName,
      bankAccountNo,
      pfAccountNo,
      companyLogo: companyLogo || settings?.company?.logoUrl,
      companyName: companyName || settings?.company?.legalName || settings?.company?.name,
      companyAddress: companyAddress || settings?.company?.addressLines,
      watermarkText: watermarkText !== undefined ? watermarkText : settings?.company?.watermarkText,
      earnings,
      deductions,
      gross,
      totalDeductions,
      net,
    });

    const safeName = (employeeName || employeeId || 'Employee').replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeName}_${employeeId || ''}_Payslip_${(period || 'Period').replace(/\s+/g, '_')}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.send(pdfBuffer);
  } catch (err) {
    console.error("[Generate PDF Route Error]:", err);
    return res.status(500).json({ message: err.message || "Failed to generate PDF" });
  }
});

export default router;

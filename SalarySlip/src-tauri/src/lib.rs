use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

fn start_backend_server(app: &tauri::App) -> Option<Child> {
    let mut exe_path = None;

    // 1. Check in app resources directory (installed production app)
    if let Ok(resource_dir) = app.path().resource_dir() {
        let sidecar_in_resources = resource_dir
            .join("binaries")
            .join("backend-x86_64-pc-windows-msvc.exe");
        if sidecar_in_resources.exists() {
            exe_path = Some(sidecar_in_resources);
        }
    }

    // 2. Check relative binaries path in workspace
    if exe_path.is_none() {
        if let Ok(curr_dir) = std::env::current_dir() {
            let relative_binary = curr_dir
                .join("src-tauri")
                .join("binaries")
                .join("backend-x86_64-pc-windows-msvc.exe");
            if relative_binary.exists() {
                exe_path = Some(relative_binary);
            }
        }
    }

    // Spawn bundled binary if found
    if let Some(binary) = exe_path {
        println!("[Tauri] Spawning backend executable: {:?}", binary);
        let mut cmd = Command::new(binary);

        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
        }

        match cmd.spawn() {
            Ok(child) => return Some(child),
            Err(e) => eprintln!("[Tauri] Failed to spawn backend binary: {}", e),
        }
    }

    // 3. Dev Fallback: spawn node ../Backend/src/server.js
    if let Ok(curr_dir) = std::env::current_dir() {
        let node_server = curr_dir
            .join("..")
            .join("Backend")
            .join("src")
            .join("server.js");

        if node_server.exists() {
            println!("[Tauri] Fallback dev mode: Spawning node backend {:?}", node_server);
            let mut cmd = Command::new("node");
            cmd.arg(&node_server);

            #[cfg(target_os = "windows")]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x08000000); // CREATE_NO_WINDOW
            }

            match cmd.spawn() {
                Ok(child) => return Some(child),
                Err(e) => eprintln!("[Tauri] Dev fallback spawn error: {}", e),
            }
        }
    }

    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            let child = start_backend_server(app);
            app.manage(BackendProcess(Mutex::new(child)));

            Ok(())
        })
        .on_window_event(|app, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Some(state) = app.try_state::<BackendProcess>() {
                    if let Ok(mut guard) = state.0.lock() {
                        if let Some(mut child) = guard.take() {
                            let _ = child.kill();
                            println!("[Tauri] Backend process terminated cleanly");
                        }
                    }
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}


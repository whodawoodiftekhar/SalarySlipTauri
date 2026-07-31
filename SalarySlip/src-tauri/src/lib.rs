use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

fn spawn_backend_process<M: Manager<R>, R: tauri::Runtime>(manager: &M) -> Option<Child> {
    let mut exe_path = None;

    // 1. Check resource directory candidate paths (installed production app)
    if let Ok(resource_dir) = manager.path().resource_dir() {
        let candidates = [
            resource_dir.join("backend-x86_64-pc-windows-msvc.exe"),
            resource_dir.join("binaries").join("backend-x86_64-pc-windows-msvc.exe"),
            resource_dir.join("backend.exe"),
            resource_dir.join("binaries").join("backend.exe"),
        ];

        for candidate in candidates {
            if candidate.exists() {
                exe_path = Some(candidate);
                break;
            }
        }
    }

    // 2. Check current executable directory candidates
    if exe_path.is_none() {
        if let Ok(current_exe) = std::env::current_exe() {
            if let Some(parent_dir) = current_exe.parent() {
                let candidates = [
                    parent_dir.join("backend-x86_64-pc-windows-msvc.exe"),
                    parent_dir.join("binaries").join("backend-x86_64-pc-windows-msvc.exe"),
                    parent_dir.join("backend.exe"),
                    parent_dir.join("binaries").join("backend.exe"),
                ];

                for candidate in candidates {
                    if candidate.exists() {
                        exe_path = Some(candidate);
                        break;
                    }
                }
            }
        }
    }

    // 3. Check relative workspace binaries path
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

    // Spawn binary if found
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

    // 4. Dev Fallback: spawn node ../Backend/src/server.js
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

#[tauri::command]
fn start_backend(app: tauri::AppHandle) -> Result<String, String> {
    if let Some(state) = app.try_state::<BackendProcess>() {
        if let Ok(mut guard) = state.0.lock() {
            // Check if process is still alive
            let is_alive = match guard.as_mut() {
                Some(child) => match child.try_wait() {
                    Ok(Some(_status)) => false, // Exited
                    Ok(None) => true,          // Still running
                    Err(_) => false,
                },
                None => false,
            };

            if is_alive {
                return Ok("Backend server is already running".to_string());
            }

            // Spawn backend process
            if let Some(child) = spawn_backend_process(&app) {
                *guard = Some(child);
                return Ok("Backend server launched successfully!".to_string());
            } else {
                return Err("Backend executable not found. Please build or install backend package.".to_string());
            }
        }
    }
    Err("Could not access backend process state".to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![start_backend])
        .setup(|app| {
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            let child = spawn_backend_process(app);
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



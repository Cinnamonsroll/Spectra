use crate::state::PICKING;
use device_query::{DeviceQuery, DeviceState};
use enigo::{Coordinate, Enigo, Mouse, Settings};
use screenshots::Screen;
use std::str::FromStr;
use std::sync::atomic::Ordering;
use std::thread;
use std::time::Duration;
use tauri::{Emitter, Manager, PhysicalPosition, PhysicalSize, Position, Size};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, serde::Serialize)]
pub struct LoupeData {
    pub r: u8,
    pub g: u8,
    pub b: u8,
    pub x: i32,
    pub y: i32,
    pub grid: Vec<u8>,
    pub grid_width: i32,
    pub grid_height: i32,
}

#[tauri::command]
pub fn move_cursor(dx: i32, dy: i32) {
    if let Ok(mut mouse) = Enigo::new(&Settings::default()) {
        let _ = mouse.move_mouse(dx, dy, Coordinate::Rel);
    }
}

#[tauri::command]
pub fn start_picking(app: tauri::AppHandle) {
    if PICKING.load(Ordering::Relaxed) {
        return;
    }
    PICKING.store(true, Ordering::Relaxed);

    thread::spawn(move || {
        let loupe_size = 15;
        let half_size = loupe_size / 2;
        let device_state = DeviceState::new();

        let screens = Screen::all().unwrap_or_default();

        while PICKING.load(Ordering::Relaxed) {
            let mouse = device_state.get_mouse();
            let x = mouse.coords.0;
            let y = mouse.coords.1;

            let capture_x = x - half_size;
            let capture_y = y - half_size;

            let screen = screens.iter().find(|s| {
                let s_x = s.display_info.x;
                let s_y = s.display_info.y;
                let s_w = s.display_info.width as i32;
                let s_h = s.display_info.height as i32;
                x >= s_x && x < s_x + s_w && y >= s_y && y < s_y + s_h
            });

            if let Some(screen) = screen {
                if let Ok(image) =
                    screen.capture_area(capture_x, capture_y, loupe_size as u32, loupe_size as u32)
                {
                    let buffer = image.as_raw();
                    let mut grid_rgb = Vec::with_capacity((loupe_size * loupe_size * 3) as usize);
                    let center_idx = (half_size * loupe_size + half_size) as usize;
                    let (mut center_r, mut center_g, mut center_b) = (0, 0, 0);

                    for i in 0..(loupe_size * loupe_size) {
                        let offset = (i * 4) as usize;
                        if offset + 3 < buffer.len() {
                            let r = buffer[offset];
                            let g = buffer[offset + 1];
                            let b = buffer[offset + 2];

                            grid_rgb.push(r);
                            grid_rgb.push(g);
                            grid_rgb.push(b);

                            if i == center_idx as i32 {
                                center_r = r;
                                center_g = g;
                                center_b = b;
                            }
                        }
                    }

                    let _ = app.emit(
                        "loupe-update",
                        LoupeData {
                            r: center_r,
                            g: center_g,
                            b: center_b,
                            x,
                            y,
                            grid: grid_rgb,
                            grid_width: loupe_size,
                            grid_height: loupe_size,
                        },
                    );
                }
            }
            thread::sleep(Duration::from_millis(16));
        }
    });
}

#[tauri::command]
pub fn stop_picking() {
    PICKING.store(false, Ordering::Relaxed);
}

#[tauri::command]
pub fn hide_window(app: tauri::AppHandle) {
    if let Some(win) = app.get_webview_window("overlay") {
        let _ = win.hide();
    }
}

#[tauri::command]
pub fn get_pixel_color() -> Result<(u8, u8, u8, i32, i32), String> {
    let device_state = DeviceState::new();
    let mouse = device_state.get_mouse();
    let x = mouse.coords.0;
    let y = mouse.coords.1;

    let screens = Screen::all().map_err(|e| e.to_string())?;
    let screen = screens
        .iter()
        .find(|s| {
            let s_x = s.display_info.x;
            let s_y = s.display_info.y;
            let s_w = s.display_info.width as i32;
            let s_h = s.display_info.height as i32;
            x >= s_x && x < s_x + s_w && y >= s_y && y < s_y + s_h
        })
        .ok_or("Screen not found")?;

    let image = screen.capture_area(x, y, 1, 1).map_err(|e| e.to_string())?;
    let buffer = image.as_raw();

    if buffer.len() >= 4 {
        Ok((buffer[0], buffer[1], buffer[2], x, y))
    } else {
        Err("Failed to get pixel".to_string())
    }
}

fn show_overlay(handle: &tauri::AppHandle) {
    if let Some(win) = handle.get_webview_window("overlay") {
        let mut min_x = 0;
        let mut min_y = 0;
        let mut max_x = 0;
        let mut max_y = 0;

        if let Ok(monitors) = handle.available_monitors() {
            for monitor in monitors {
                let pos = monitor.position();
                let size = monitor.size();
                let x = pos.x;
                let y = pos.y;
                let w = size.width as i32;
                let h = size.height as i32;

                if x < min_x {
                    min_x = x;
                }
                if y < min_y {
                    min_y = y;
                }
                if x + w > max_x {
                    max_x = x + w;
                }
                if y + h > max_y {
                    max_y = y + h;
                }
            }
        }

        let width = (max_x - min_x) as u32;
        let height = (max_y - min_y) as u32;

        let _ = win.set_position(Position::Physical(PhysicalPosition { x: min_x, y: min_y }));
        let _ = win.set_size(Size::Physical(PhysicalSize { width, height }));

        let _ = win.show();
        let _ = win.set_focus();
        let _ = win.emit("shortcut-triggered", ());
    }
}

pub fn trigger_picker(handle: &tauri::AppHandle) {
    show_overlay(handle);
}

#[tauri::command]
pub fn register_shortcut(app: tauri::AppHandle, shortcut: String) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|e| e.to_string())?;

    if let Ok(shortcut_obj) = Shortcut::from_str(&shortcut) {
        let handle_clone = app.clone();
        app.global_shortcut()
            .on_shortcut(shortcut_obj, move |_app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    trigger_picker(&handle_clone);
                }
            })
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Invalid shortcut format".into())
    }
}

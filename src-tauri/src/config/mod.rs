pub mod defaults;

use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Profile {
    pub id: String,
    pub name: String,
    pub shell: String,
    pub args: Vec<String>,
    pub env: HashMap<String, String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub cwd: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub font_family: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub font_size: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub theme_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none", default)]
    pub is_default: Option<bool>,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum CursorStyle {
    Block,
    Underline,
    Bar,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum BellStyle {
    None,
    Sound,
    Visual,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TabBarPosition {
    Top,
    Bottom,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum RightClickBehavior {
    Paste,
    Menu,
    SelectWord,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub theme_id: String,
    pub font_family: String,
    pub font_size: u32,
    pub font_weight: u32,
    pub line_height: f32,
    pub letter_spacing: f32,
    pub opacity: f32,
    pub window_blur: bool,
    pub animations: bool,

    pub cursor_style: CursorStyle,
    pub cursor_blink: bool,
    pub scrollback: u32,
    pub bell_style: BellStyle,
    pub copy_on_select: bool,
    pub right_click_behavior: RightClickBehavior,
    pub word_separators: String,
    pub smooth_scrolling: bool,

    pub tab_bar_position: TabBarPosition,
    pub show_tab_bar_when_single: bool,
    pub show_status_bar: bool,
    pub confirm_close_window: bool,
    pub confirm_close_tab: bool,

    pub profiles: Vec<Profile>,
    pub default_profile_id: String,

    pub keybindings: HashMap<String, Option<String>>,

    pub gpu_acceleration: bool,
    #[serde(rename = "webGLRendering")]
    pub web_gl_rendering: bool,
    pub ligatures: bool,
}

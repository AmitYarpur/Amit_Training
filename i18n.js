// Central translation dictionary and DOM-translation helper, shared by
// every page. Keeps all UI strings in one place instead of scattered
// across ~16 HTML files.

const translations = {
  en: {
    // Shared
    eyebrow_helth: "Helth",
    eyebrow_reports: "Reports",
    back_home: "Back to home",
    back_training: "Back to training",
    back_reports: "Back to reports",
    back_training_reports: "Back to training reports",
    submit: "Submit",
    are_you_sure: "Are you sure?",
    edit: "Edit",
    yes_save: "Yes, Save",
    saved_title: "Saved",
    log_another_reading: "Log another reading",
    log_another_session: "Log another session",
    coming_soon: "coming soon",

    feature_training_timers: "Training Timers",

    // index.html
    auth_login_title: "Log In",
    auth_login_subtext: "Welcome back. Enter your username and password.",
    auth_signup_title: "Sign Up",
    auth_signup_subtext: "Choose a username and password. Anyone can join.",
    username_placeholder: "Username",
    password_placeholder: "Password",
    auth_login_btn: "Log In",
    auth_signup_btn: "Sign Up",
    new_here: "New here? ",
    sign_up_link: "Sign Up",
    already_have_account: "Already have an account? ",
    log_in_link: "Log In",
    err_enter_username_password: "Please enter a username and password.",
    welcome_headline: "Wellcome {username}",
    welcome_subtext: "Your personal health tracker. Log readings, watch trends, stay on top of it.",
    start_btn: "Start",
    signed_in_as: "Signed in as ",
    log_out: "Log out",
    home_page: "Home Page",
    tile_blood_pressure: "Blood Pressure",
    tile_weight: "Weight",
    tile_training: "Training",
    tile_training_timers: "Training Timers",
    tile_reports: "Reports",
    tile_settings: "Settings",

    today_headline: "Today is the {date} and {time}",

    // blood-pressure.html
    eyebrow_blood_pressure: "Blood Pressure",
    field_systolic: "Systolic (top number)",
    field_diastolic: "Diastolic (bottom number)",
    field_heart_rate: "Heart rate",
    err_bp_missing: "Please enter all 3 values before submitting.",
    err_bp_save_failed: "Could not save readings, please try again.\n",

    // weight.html
    eyebrow_weight: "Weight",
    field_weight_kg: "Weight (kg)",
    err_weight_missing: "Please enter your weight before submitting.",
    err_weight_save_failed: "Could not save weight, please try again.\n",

    // running.html / walking.html
    eyebrow_running: "Running",
    eyebrow_walking: "Walking",
    field_distance_km: "Distance (km)",
    field_time_min: "Time (minutes)",
    err_training_missing: "Please enter both distance and time before submitting.",
    err_session_save_failed: "Could not save session, please try again.\n",
    summary_distance: "Distance",
    summary_time: "Time",

    // pulldown.html / bench-press.html
    eyebrow_pulldown: "Pulldown",
    eyebrow_bench_press: "Bench Press / Butterfly",
    field_sessions: "Sessions (1-4)",
    err_pulldown_missing: "Please enter both sessions and weight before submitting.",
    summary_sessions: "Sessions",
    summary_weight: "Weight",

    // abs.html (workout type choices stay in English regardless of language - by design)
    field_workout_type: "Workout Type",
    err_abs_missing: "Please choose a workout type before submitting.",

    // plank.html
    eyebrow_plank: "Plank",
    field_seconds: "Duration (seconds)",
    err_plank_missing: "Please enter your plank duration before submitting.",

    // training.html
    headline_training: "Training",
    tile_running: "Running",
    tile_walking: "Walking",
    tile_pulldown: "Pulldown",
    tile_bench_press: "Bench Press / Butterfly",
    tile_abs: "Abs",
    tile_plank: "Plank",

    // reports.html
    headline_reports: "Reports",
    tile_bp_reports: "Blood Pressure Reports",
    tile_weight_reports: "Weight Reports",
    tile_training_reports: "Training Reports",

    // training-reports.html
    headline_training_reports: "Training Reports",

    // settings.html
    headline_settings: "Settings",
    settings_subtext: "These preferences are saved to your account and apply everywhere you log in.",
    section_appearance: "Appearance",
    bright_mode: "Bright Mode",
    dark_mode: "Dark Mode",
    section_language: "Language",
    lang_english: "English",
    lang_hebrew: "Hebrew",
    saving_ellipsis: "Saving…",
    could_not_save_prefix: "Could not save: ",

    // Report pages (shared)
    headline_bp_report: "Blood Pressure Report",
    headline_weight_report: "Weight Report",
    headline_running_report: "Running Report",
    headline_walking_report: "Walking Report",
    headline_pulldown_report: "Pulldown Report",
    headline_bench_press_report: "Bench Press / Butterfly Report",
    headline_abs_report: "Abs Report",
    headline_plank_report: "Plank Report",
    for_user_prefix: "for ",
    loading_readings: "Loading readings…",
    loading_sessions: "Loading sessions…",
    no_bp_logged: "No blood pressure readings logged yet.",
    no_weight_logged: "No weight readings logged yet.",
    no_running_logged: "No running sessions logged yet.",
    no_walking_logged: "No walking sessions logged yet.",
    no_pulldown_logged: "No pulldown sessions logged yet.",
    no_bench_press_logged: "No bench press / butterfly sessions logged yet.",
    no_abs_logged: "No abs workouts logged yet.",
    no_plank_logged: "No plank sessions logged yet.",
    could_not_load_readings: "Could not load readings: ",
    could_not_load_sessions: "Could not load sessions: ",
    range_week: "Last Week",
    range_month: "Last Month",
    range_3months: "Last 3 Months",
    range_year: "Last Year",
    range_all: "All Time",
    no_readings_in_range: "No readings in this range.",
    no_sessions_in_range: "No sessions in this range.",
    export_csv: "Export to CSV",
    legend_systolic: "Systolic",
    legend_diastolic: "Diastolic",
    legend_heart_rate: "Heart rate",
    table_date: "Date",
    table_time: "Time",
    table_weight_kg: "Weight (kg)",
    table_distance_km: "Distance (km)",
    table_duration_min: "Duration (min)",
    table_sessions: "Sessions",
    table_workout_type: "Workout Type",
    table_seconds: "Duration (sec)",
    unit_km: "km",
    unit_min: "min",
    unit_kg: "kg",
    unit_sessions_suffix: "sessions",
    unit_sec: "sec",
    workout_count_suffix: "times"
  },

  he: {
    // Shared
    eyebrow_helth: "Helth",
    eyebrow_reports: "דוחות",
    back_home: "חזרה לדף הבית",
    back_training: "חזרה לאימונים",
    back_reports: "חזרה לדוחות",
    back_training_reports: "חזרה לדוחות אימונים",
    submit: "שליחה",
    are_you_sure: "האם אתה בטוח?",
    edit: "עריכה",
    yes_save: "כן, שמור",
    saved_title: "נשמר",
    log_another_reading: "הוסף מדידה נוספת",
    log_another_session: "הוסף אימון נוסף",
    coming_soon: "בקרוב",

    feature_training_timers: "טיימרים לאימון",

    // index.html
    auth_login_title: "התחברות",
    auth_login_subtext: "ברוך שובך. הזן שם משתמש וסיסמה.",
    auth_signup_title: "הרשמה",
    auth_signup_subtext: "בחר שם משתמש וסיסמה. כל אחד יכול להצטרף.",
    username_placeholder: "שם משתמש",
    password_placeholder: "סיסמה",
    auth_login_btn: "התחברות",
    auth_signup_btn: "הרשמה",
    new_here: "חדש כאן? ",
    sign_up_link: "הרשמה",
    already_have_account: "כבר יש לך חשבון? ",
    log_in_link: "התחברות",
    err_enter_username_password: "נא להזין שם משתמש וסיסמה.",
    welcome_headline: "שלום, {username}",
    welcome_subtext: "אפליקציית הבריאות האישית שלך. תעד מדידות, עקוב אחר מגמות והישאר על הפולס.",
    start_btn: "התחלה",
    signed_in_as: "מחובר/ת בתור ",
    log_out: "התנתקות",
    home_page: "דף הבית",
    tile_blood_pressure: "לחץ דם",
    tile_weight: "משקל",
    tile_training: "אימונים",
    tile_training_timers: "טיימרים לאימון",
    tile_reports: "דוחות",
    tile_settings: "הגדרות",

    today_headline: "היום {date}, השעה {time}",

    // blood-pressure.html
    eyebrow_blood_pressure: "לחץ דם",
    field_systolic: "סיסטולי (מספר עליון)",
    field_diastolic: "דיאסטולי (מספר תחתון)",
    field_heart_rate: "דופק",
    err_bp_missing: "נא להזין את שלושת הערכים לפני השליחה.",
    err_bp_save_failed: "לא ניתן היה לשמור את המדידה, נסה שוב.\n",

    // weight.html
    eyebrow_weight: "משקל",
    field_weight_kg: "משקל (ק״ג)",
    err_weight_missing: "נא להזין את המשקל לפני השליחה.",
    err_weight_save_failed: "לא ניתן היה לשמור את המשקל, נסה שוב.\n",

    // running.html / walking.html
    eyebrow_running: "ריצה",
    eyebrow_walking: "הליכה",
    field_distance_km: "מרחק (ק״מ)",
    field_time_min: "זמן (דקות)",
    err_training_missing: "נא להזין מרחק וזמן לפני השליחה.",
    err_session_save_failed: "לא ניתן היה לשמור את האימון, נסה שוב.\n",
    summary_distance: "מרחק",
    summary_time: "זמן",

    // pulldown.html / bench-press.html
    eyebrow_pulldown: "פולי עליון",
    eyebrow_bench_press: "לחיצת חזה / פרפר",
    field_sessions: "סטים (1-4)",
    err_pulldown_missing: "נא להזין סטים ומשקל לפני השליחה.",
    summary_sessions: "סטים",
    summary_weight: "משקל",

    // abs.html (workout type choices stay in English regardless of language - by design)
    field_workout_type: "סוג אימון",
    err_abs_missing: "נא לבחור סוג אימון לפני השליחה.",

    // plank.html
    eyebrow_plank: "פלאנק",
    field_seconds: "משך (שניות)",
    err_plank_missing: "נא להזין את משך הפלאנק לפני השליחה.",

    // training.html
    headline_training: "אימונים",
    tile_running: "ריצה",
    tile_walking: "הליכה",
    tile_pulldown: "פולי עליון",
    tile_bench_press: "לחיצת חזה / פרפר",
    tile_abs: "בטן",
    tile_plank: "פלאנק",

    // reports.html
    headline_reports: "דוחות",
    tile_bp_reports: "דוחות לחץ דם",
    tile_weight_reports: "דוחות משקל",
    tile_training_reports: "דוחות אימונים",

    // training-reports.html
    headline_training_reports: "דוחות אימונים",

    // settings.html
    headline_settings: "הגדרות",
    settings_subtext: "ההעדפות הללו נשמרות בחשבון שלך וחלות בכל מקום שבו תתחבר.",
    section_appearance: "מראה",
    bright_mode: "מצב בהיר",
    dark_mode: "מצב כהה",
    section_language: "שפה",
    lang_english: "אנגלית",
    lang_hebrew: "עברית",
    saving_ellipsis: "שומר…",
    could_not_save_prefix: "לא ניתן היה לשמור: ",

    // Report pages (shared)
    headline_bp_report: "דוח לחץ דם",
    headline_weight_report: "דוח משקל",
    headline_running_report: "דוח ריצה",
    headline_walking_report: "דוח הליכה",
    headline_pulldown_report: "דוח פולי עליון",
    headline_bench_press_report: "דוח לחיצת חזה / פרפר",
    headline_abs_report: "דוח בטן",
    headline_plank_report: "דוח פלאנק",
    for_user_prefix: "עבור ",
    loading_readings: "טוען מדידות…",
    loading_sessions: "טוען אימונים…",
    no_bp_logged: "עדיין לא נרשמו מדידות לחץ דם.",
    no_weight_logged: "עדיין לא נרשם משקל.",
    no_running_logged: "עדיין לא נרשמו אימוני ריצה.",
    no_walking_logged: "עדיין לא נרשמו אימוני הליכה.",
    no_pulldown_logged: "עדיין לא נרשמו אימוני פולי עליון.",
    no_bench_press_logged: "עדיין לא נרשמו אימוני לחיצת חזה / פרפר.",
    no_abs_logged: "עדיין לא נרשמו אימוני בטן.",
    no_plank_logged: "עדיין לא נרשמו אימוני פלאנק.",
    could_not_load_readings: "לא ניתן היה לטעון את המדידות: ",
    could_not_load_sessions: "לא ניתן היה לטעון את האימונים: ",
    range_week: "השבוע האחרון",
    range_month: "החודש האחרון",
    range_3months: "3 החודשים האחרונים",
    range_year: "השנה האחרונה",
    range_all: "כל הזמן",
    no_readings_in_range: "אין מדידות בטווח זה.",
    no_sessions_in_range: "אין אימונים בטווח זה.",
    export_csv: "ייצוא ל-CSV",
    legend_systolic: "סיסטולי",
    legend_diastolic: "דיאסטולי",
    legend_heart_rate: "דופק",
    table_date: "תאריך",
    table_time: "שעה",
    table_weight_kg: "משקל (ק״ג)",
    table_distance_km: "מרחק (ק״מ)",
    table_duration_min: "משך (דקות)",
    table_sessions: "סטים",
    table_workout_type: "סוג אימון",
    table_seconds: "משך (שניות)",
    unit_km: "ק״מ",
    unit_min: "דק'",
    unit_kg: "ק״ג",
    unit_sessions_suffix: "סטים",
    unit_sec: "שנ'",
    workout_count_suffix: "פעמים"
  }
};

function t(key, lang, vars) {
  const dict = translations[lang] || translations.en;
  let str = dict[key] !== undefined ? dict[key] : (translations.en[key] !== undefined ? translations.en[key] : key);
  if (vars) {
    Object.keys(vars).forEach(k => {
      str = str.split('{' + k + '}').join(vars[k]);
    });
  }
  return str;
}

// Applies translations to every element with a data-i18n attribute
// (textContent), data-i18n-placeholder (input placeholder), or
// data-i18n-aria (aria-label, for icon-only controls with no visible
// text), and sets the page's text direction. Call after the DOM for
// the page is present.
function translatePage(lang) {
  document.documentElement.setAttribute('lang', lang === 'he' ? 'he' : 'en');
  document.documentElement.setAttribute('dir', lang === 'he' ? 'rtl' : 'ltr');

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.getAttribute('data-i18n'), lang);
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.setAttribute('placeholder', t(el.getAttribute('data-i18n-placeholder'), lang));
  });

  document.querySelectorAll('[data-i18n-aria]').forEach(el => {
    el.setAttribute('aria-label', t(el.getAttribute('data-i18n-aria'), lang));
  });
}

// Plain global script (not an ES module) on purpose: it needs to run
// synchronously, blocking parsing, right after the page's data-i18n
// markup - so the correct language paints the first time, instead of
// English flashing until the always-deferred module script catches up.
window.I18N = { t, translatePage };

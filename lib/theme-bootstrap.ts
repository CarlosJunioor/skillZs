export const THEME_BOOTSTRAP = `(function() {
  try {
    var s = localStorage.getItem("skillzs-theme");
    if (s === "dark" || s === "light") {
      document.documentElement.dataset.theme = s;
    }
  } catch (e) {}
})();`;

(function () {
  var stored = 'light';
  try {
    stored = localStorage.getItem('theme') || localStorage.getItem('qc-theme') || 'light';
  } catch (e) {}
  document.documentElement.setAttribute('data-theme', stored);
  if (document.body) {
    document.body.classList.remove('theme-light', 'theme-dark', 'theme-eyecare');
    document.body.classList.add('theme-' + stored);
  }
})();

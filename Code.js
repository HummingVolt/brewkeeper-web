function doGet() {
  // Set the page title
  document.title = 'BrewKeeper';

  // Add viewport meta tag for responsiveness
  const meta = document.createElement('meta');
  meta.name = 'viewport';
  meta.content = 'width=device-width, initial-scale=1';
  document.head.appendChild(meta);

  // Allow embedding in iframes (X-Frame-Options is a server header, not client-side JS)
  // This part must be configured on the server, not in JS.
}

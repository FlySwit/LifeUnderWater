// Vercel Speed Insights initialization
// This script injects Speed Insights tracking into the page

(function() {
  // Initialize the queue for Speed Insights
  window.si = window.si || function() {
    (window.siq = window.siq || []).push(arguments);
  };

  // Create and inject the Speed Insights script
  const script = document.createElement('script');
  script.defer = true;
  
  // Use the default Vercel Speed Insights path
  // This will be available after deployment to Vercel
  script.src = '/_vercel/speed-insights/script.js';
  
  // For development, you can use the debug version:
  // script.src = 'https://va.vercel-scripts.com/v1/speed-insights/script.debug.js';
  
  script.onerror = function() {
    console.warn('Speed Insights: Script failed to load. This is expected in local development. It will work when deployed to Vercel.');
  };
  
  document.head.appendChild(script);
})();

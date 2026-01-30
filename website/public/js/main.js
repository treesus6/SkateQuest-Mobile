// SkateQuest Landing Page JavaScript

// Contact Form Handler
document.getElementById('contactForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formStatus = document.getElementById('formStatus');
  const submitButton = e.target.querySelector('button[type="submit"]');

  // Get form data
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    subject: document.getElementById('subject').value,
    message: document.getElementById('message').value,
    timestamp: new Date().toISOString(),
    source: 'website',
  };

  // Disable submit button
  submitButton.disabled = true;
  submitButton.textContent = 'Sending...';

  try {
    // Send to Supabase feedback table
    const response = await fetch(
      'https://hreeuqdgrwvnxquxohod.supabase.co/rest/v1/feedback',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey:
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZWV1cWRncnd2bnhxdXhvaG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDkzMjksImV4cCI6MjA3NDY4NTMyOX0.fAHN4tvPdebHzqpgp0Q-g3mLRBfTca5WguRNjiQ1dus',
          Authorization:
            'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhyZWV1cWRncnd2bnhxdXhvaG9kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxMDkzMjksImV4cCI6MjA3NDY4NTMyOX0.fAHN4tvPdebHzqpgp0Q-g3mLRBfTca5WguRNjiQ1dus',
        },
        body: JSON.stringify(formData),
      }
    );

    if (response.ok) {
      formStatus.textContent = 'Thank you! We received your message and will respond soon.';
      formStatus.className = 'form-status success';
      e.target.reset();

      // Send automated email response (trigger email bot)
      await sendAutoReply(formData);
    } else {
      throw new Error('Failed to submit form');
    }
  } catch (error) {
    console.error('Form submission error:', error);
    formStatus.textContent =
      'Oops! Something went wrong. Please try again or email us directly at support@sk8.quest';
    formStatus.className = 'form-status error';
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = 'Send Message';

    // Hide status message after 5 seconds
    setTimeout(() => {
      formStatus.style.display = 'none';
    }, 5000);
  }
});

// Automated Email Reply Function
async function sendAutoReply(formData) {
  // This will trigger your email bot
  const autoReplyData = {
    to: formData.email,
    subject: `Re: ${formData.subject} - SkateQuest Support`,
    template: 'auto_reply',
    data: {
      name: formData.name,
      subject: formData.subject,
      original_message: formData.message,
    },
  };

  try {
    await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(autoReplyData),
    });
  } catch (error) {
    console.error('Auto-reply error:', error);
    // Fail silently - user feedback was already saved
  }
}

// Download Button Analytics
document.getElementById('android-download').addEventListener('click', (e) => {
  // Track download click
  if (window.posthog) {
    posthog.capture('android_download_clicked', {
      source: 'website',
      button: 'android',
    });
  }

  // Update this URL when APK is ready
  if (e.target.href === '#') {
    e.preventDefault();
    alert(
      'APK download will be available soon! Please check back or leave your email in the contact form to be notified.'
    );
  }
});

document.getElementById('ios-download').addEventListener('click', (e) => {
  e.preventDefault();
  alert('iOS version coming soon! Join our TestFlight beta by emailing support@sk8.quest');
});

// Smooth Scrolling
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    if (href !== '#') {
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }
  });
});

// Navbar scroll effect
window.addEventListener('scroll', () => {
  const nav = document.querySelector('.nav');
  if (window.scrollY > 50) {
    nav.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
  } else {
    nav.style.boxShadow = 'none';
  }
});

// Initialize PostHog Analytics (optional)
if (window.location.hostname !== 'localhost') {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/posthog-js@1/dist/posthog.min.js';
  script.onload = () => {
    if (window.posthog) {
      posthog.init('YOUR_POSTHOG_KEY', {
        api_host: 'https://app.posthog.com',
        autocapture: true,
      });
    }
  };
  document.head.appendChild(script);
}

// Newsletter signup (if you add one)
function subscribeNewsletter(email) {
  return fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
}

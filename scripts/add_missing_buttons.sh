#!/bin/bash
# Find the line after legalBtn handler and add the missing button handlers

# First, let's find where to insert (after the legalBtn block ends)
LINE=$(grep -n "legalBtn.onclick" app.js | cut -d: -f1)

# Add challengesBtn handler
sed -i "${LINE}i\\    if (challengesBtn) {\\n        challengesBtn.onclick = () => {\\n            setActiveButton(challengesBtn);\\n            content.innerHTML = '<h2>Challenges</h2><p>View and participate in skating challenges. Feature coming soon!</p>';\\n        };\\n    }\\n" app.js

echo "Added missing button handlers"

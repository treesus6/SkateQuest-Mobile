#!/usr/bin/env python3
with open('app.js', 'r') as f:
    lines = f.readlines()

# Remove lines 46-50 (the duplicate map initialization)
# Keep everything before line 45 and after line 50
new_lines = lines[:45] + lines[50:]

with open('app.js', 'w') as f:
    f.writelines(new_lines)

print("✓ Removed duplicate map initialization from app.js")

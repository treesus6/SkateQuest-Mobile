#!/bin/bash
# Add null check around the feed operations
sed -i '774s/if (feed) feed.innerHTML/if (!feed) return;\n            feed.innerHTML/' main.js
echo "Fixed feed null check"

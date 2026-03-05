#!/bin/bash
# Fix the missing Firebase imports in main.js
sed -i '886s/const { db, getDocs, collectionGroup } = window.firebaseInstances;/const { db, getDocs, collectionGroup, doc, setDoc } = window.firebaseInstances;/' main.js
echo "Fixed Firebase imports in main.js"

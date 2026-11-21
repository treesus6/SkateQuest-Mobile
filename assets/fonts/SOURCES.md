# Bundled scene typefaces

Source: https://github.com/google/fonts, retrieved November 21, 2026.
Each family's SIL Open Font License is included beside these files.

- Space Grotesk: ofl/spacegrotesk/SpaceGrotesk[wght].ttf, instantiated at 700.
- Plus Jakarta Sans: ofl/plusjakartasans/PlusJakartaSans[wght].ttf, instantiated at 400 and 700.
- JetBrains Mono: ofl/jetbrainsmono/JetBrainsMono[wght].ttf, instantiated at 500.

Static instances are generated with fontTools.varLib.instancer for consistent
Android/iOS/web rendering. They are bundled in the app and require no font CDN.
The native application loads them with expo-font before rendering its routes.

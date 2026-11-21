import React, { useId } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle, Defs, Line, Pattern, Rect } from 'react-native-svg';
export default function SceneTexture() {
  const id = `scene-${useId().replace(/[^a-z0-9]/gi, '')}`;
  return (
    <View
      pointerEvents="none"
      accessible={false}
      style={[StyleSheet.absoluteFill, { overflow: 'hidden', opacity: 0.3 }]}
    >
      <Svg width="100%" height="100%">
        <Defs>
          <Pattern id={id} width={18} height={18} patternUnits="userSpaceOnUse">
            <Circle cx={2} cy={2} r={1} fill="#979EAA" />
            <Line x1={0} y1={17} x2={18} y2={17} stroke="#979EAA" strokeWidth={0.25} />
          </Pattern>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${id})`} />
      </Svg>
    </View>
  );
}

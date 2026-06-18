declare module 'react-native/Libraries/Image/resolveAssetSource' {
  import { ImageSourcePropType } from 'react-native';
  
  interface ResolvedAssetSource {
    uri: string;
    width: number;
    height: number;
    scale: number;
  }

  function resolveAssetSource(source: ImageSourcePropType | number): ResolvedAssetSource;
  export default resolveAssetSource;
}

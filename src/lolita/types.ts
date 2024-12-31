import type { AnimationDirection, AnimationItem, AnimationSegment } from './lottie';
import { Animation, Layer, LayerType } from '@lottiefiles/lottie-types';

export type { AnimationSegment, LayerType };


export type PlayOption = {
  segments: AnimationSegment;
  playCount?: number;
  speed?: number;
  direction?: AnimationDirection;
  onStart?: Function;
  onComplete?: Function;
}

// lolita 对外 playAnimation 方法的入参
export type WidePlayOption = Omit<PlayOption, "segments"> & { name :string} | PlayOption;

export type PlayOptionType = string | WidePlayOption | WidePlayOption[];


// lolita 内部 playSegments 方法的入参
export interface PlaySegmentsOption {
  segments: AnimationSegment;
  speed: number;
  direction?: AnimationDirection;
}

export enum DeviceLevel {
  HIGH = 'HIGH',
  MID = 'MID',
  LOW = 'LOW',
}

export interface ReplaceOption {
  name?: string;
  path?: string;
  value: string;
}
export interface SimpleReplaceOption {
  [key: string]: string;
}

export type ReplaceOptionType = ReplaceOption[] | SimpleReplaceOption;

export interface ClickCallback {
  (this: HTMLElement, ev: MouseEvent): any;
}
export interface LayerClickOptions {
  [key: string]: ClickCallback;
}
export interface LolitaConstructorOption {
  path?: string;
  animationData?: any;
  precompile?: Function;
  container: HTMLElement;
  config?: any;
  deviceLevel?: DeviceLevel;
  [name: string]: any;
}

// 修正官方未暴露的变量
export interface AnimationItemX extends AnimationItem {
  animationData: Animation;
  configAnimation: Function;
  renderer: {
    rendererType: string;
    elements: Element[];
    renderConfig: any;
  };
}

// 运行时的 lottie 内部对象，指代合成、文本、形状、图片等
export interface Element {
  data: Layer.Main;
  elements?: Element[];
  [key: string]: any; // 允许其他属性
}

export type AnimationData = Animation & {
  lolitaAnimations?: any;
};

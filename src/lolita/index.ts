// @ts-ignore
import * as lottie from 'lottie-web';
import EventEmitter from 'eventemitter3';
// import find from 'lodash.find';
import type {
  LolitaConstructorOption,
  PlaySegmentsOption,
  ReplaceOptionType,
  // DeviceLevel,
  AnimationItemX,
  WidePlayOption,
  PlayOptionType,
  // ReplaceOption,
  // ClickCallback,
  LayerClickOptions,
  AnimationData,
  LayerType,
  AnimationSegment,
} from './types';

import {
  // PATH_KEY,
  ANIMATION_KEY,
  // DEGRADE_KEY,
  // degrade,
  normalizePlayOptions,
  fetchJSON,
} from './util';
import * as util from './util';


enum LayerTypeEnum {
  PRECOMPOSITION = 0 as LayerType.VALUE.PRECOMPOSITION,
  IMAGE = 2 as LayerType.VALUE.IMAGE,
  TEXT = 5 as LayerType.VALUE.TEXT,
}

type ReadyEvent = 'DataLoaded' | 'AnimationLoaded';
class Lolita {
  anim?: AnimationItemX;

  isDataLoaded = false; // 数据是否载入完成

  isAnimationLoaded = false; // 动画是否载入完成

  animationData: AnimationData; // lottie json 数据

  restProps: any;

  protected container: HTMLElement | undefined;

  protected config: any;

  // protected deviceLevel: DeviceLevel | undefined; // 机型等级

  // protected paths: any; // lolita 扩展的 path 数据

  protected animations: any; // lolita 扩展的 animation 数据

  protected ee = new EventEmitter();

  // private layerClickListeners: Array<[HTMLElement, ClickCallback]> = [];

  /**
   * 初始化包括以下步骤，可以通过继承时 override 相应方法来改变行为
   * * ajax 获取数据
   * * 字段解析赋值（比如 path, animation）
   * * 降级预处理
   * * 初始化 lottie-web 对象
   */
  constructor({
    path,
    // precompile,
    animationData,
    container,
    config = {},
    // deviceLevel,
    ...restProps
  }: LolitaConstructorOption) {
    this.animationData = animationData;
    this.container = container;
    this.config = config;
    // this.deviceLevel = deviceLevel;
    this.restProps = restProps;

    if (path) {
      this.fetchData({
        path,
        // precompile,
      });
    }
    if (animationData) {
      this.isDataLoaded = true;
    }

    this.initProps();
    this.processDowngrade();
    this.initAnim();
  }

  // ajax 获取数据
  protected async fetchData({ path }: { path: string }) {
    // if (precompile) {
    //   AssetLoader.addTextInterceptor(precompile);
    // }
    try {
      const data = await fetchJSON(path);
      // 这个步骤完成后，衔接字段解析赋值、降级预处理、lottie-web 对象初始化
      this.animationData = data;
      this.initProps();
      // this.processDowngrade();
      this.isDataLoaded = true;
      this.ee.emit('DataLoaded');
      // 从 lottie-web 源码分析可知，获取完数据后自己调用一次 configAnimation 即可
      // see https://github.com/airbnb/lottie-web/blob/1932b7db1ccbd4d747bfd3a46b6dad126c77c01d/player/js/animation/AnimationItem.js#L94
      this.anim?.configAnimation(data);
    } catch (e) {
      // 异常包括：网络异常、响应非 json、json 非 lottie 等
      this.ee.emit('error', e);
    }
  }

  // 字段解析赋值
  protected initProps() {
    if (!this.animationData) {
      return;
    }
    // TODO
    // // lolita path 处理
    // this.paths = this.animationData[PATH_KEY] || [];

    // // lolita animation 处理
    const animations = this.animationData[ANIMATION_KEY] || [];
    // 如果 lottie.json 内没有 ALL，那么默认加上
    if (!animations.some((a: any) => a.name === 'ALL')) {
      animations.push({
        name: 'ALL',
        start: this.animationData.ip,
        end: this.animationData.op,
      });
    }
    this.animations = animations;
  }

  // 预处理降级
  protected processDowngrade() {
    // TODO
  }

  // 初始化 lottie-web 的 AnimationItem 对象（this.anim)
  protected initAnim() {
    this.anim = (lottie as any).loadAnimation({
      container: this.container,
      animationData: this.animationData,
      renderer: 'svg',
      loop: false,
      autoplay: false,
      ...this.config,
      rendererSettings: {
        preserveAspectRatio: 'xMinYMin meet',
        dpr: 1,
        ...(this.config.rendererSettings || {}),
      },
    }) as AnimationItemX;

    this.anim.setSubframe(this.config.subframe);
    // Note 默认隐藏，调用 play 相关方法时才显示
    // 可以规避占位符替换时首帧的「抖动」，暂不开放配置参数
    // 仅针对 svg renderer，canvas/html 由于 canvas 未被实例化调用会发生异常因此暂无法避免「抖动」
    if (this.anim.renderer.rendererType === 'svg') {
      this.setVisible(false);
    }
    this.anim.addEventListener('DOMLoaded', () => {
      this.isAnimationLoaded = true;
      this.ee.emit('AnimationLoaded');
    });
  }

  // 监听事件
  on(eventName: string, fn: (...args: any[]) => void) {
    this.ee.on(eventName, fn);
  }

  // 判断数据加载完成、动画加载完成等事件是否已发生
  ready(eventName: ReadyEvent) {
    const fieldName = ({
      DataLoaded: 'isDataLoaded',
      AnimationLoaded: 'isAnimationLoaded',
    } as const)[eventName];
    const field = this[fieldName];
    if (field) {
      return true;
    } else {
      return new Promise((resolve) => this.ee.on(eventName, resolve));
    }
  }

  /**
   * 播放指定的 animation, 通过 JSON 中扩展的 lolitaAnimations 字段定义 animation，如
   *   "lolitaAnimation": [ {"name": "clip1", "start": 0, "end": 48 } ]
   * 表示定义了 名为 `clip1` 的 animation, 从 0 播放至 48 帧
   * 默认添加了名为 `ALL` 的 animation 表示全部播放
   *
   * @example
   *   // clip1 播放 5 次
   *   item.playAnimation({ name: 'clip1', playCount: 5 });
   *
   *   // clip1 播放 1 次，然后无限循环播放 clip2
   *   item.playAnimation([
   *     { name: 'clip1', playCount: 1 },
   *     { name: 'clip1', playCount: 0 }
   *   ]);
   *
   * @param name animation 名称
   * @param speed 播放速度，缺省为 1
   * @param playCount 播放次数，缺省为 1，如果为 0 表示无限循环
   * @returns Promise 播放异步控制的 Promise
   */
  async playAnimation(config: PlayOptionType) {
    await this.ready('AnimationLoaded');
    if (!this.anim) {
      throw new Error(
        `Lolita anim 已销毁，请检查调用关系是否正常, config: ${JSON.stringify(config)}`,
      );
    }

    const playOptions = normalizePlayOptions(
      config,
      this.animations,
      this.animationData.fr,
    );

    if (!this.anim.isPaused) {
      this.stop();
    }

    for (let i = 0; i < playOptions.length; i++) {
      const {
        playCount = 1,
        speed = 1,
        direction,
        onStart,
        onComplete,
        segments,
      } = playOptions[i];
      onStart && onStart();
      let j = 0;
      while (playCount === 0 || j++ < playCount) {
        await this.playSegments({
          segments,
          speed,
          direction,
        });
      }
      onComplete && onComplete();
    }
  }

  setVisible(visible: boolean) {
    if (!this.anim) return;
    if (visible) {
      this.anim.show();
    } else {
      this.anim.hide();
    }
  }

  playSegments({
    segments,
    speed,
    direction = 1,
  }: PlaySegmentsOption): Promise<void> {
    if (!this.anim) {
      return Promise.reject(
        new Error(
          `Lolita anim 已销毁，请检查调用关系是否正常, config: ${segments[0]}-${segments[1]}-${speed}-${direction}`,
        ),
      );
    }

    // logger.debug(
    //   `[lolita play] ${start}-${end}, speed ${speed}, direction ${direction}`,
    // );
    return new Promise((resolve) => {
      if (!this.anim) return;
      const seg: AnimationSegment =
        direction === 1 ? segments : segments.reverse() as AnimationSegment;
      this.setVisible(true);
      this.anim.setSpeed(speed);
      this.anim.playSegments(seg, true);
      const removeListener = this.anim.addEventListener('complete', () => {
        resolve();
        setTimeout(() => {
          // 移除监听，避免外部迭代触发时出现问题所以 setTimeout
          if (!this.anim) return;
          removeListener();
        }, 0);
      });
    });
  }

  /**
   * 将 lottie 中的占位符，替换为相应的内容（文本或图片），需要在 JSON 中通过 lolitaPaths 扩展字段先定义好占位符对应的 path，如
   *   "lolitaPaths": [ {"name": "increase", "path":"comp1,tisheng"} ]
   * 文字替换只支持 svg/html, canvas 不支持 https://github.com/airbnb/lottie-web/issues/250
   *
   * @example
   * replace([
   *   { name: 'increase', value: '提升 11.11%'},  // 文字
   *   { name: 'image1', value: 'https://www.xxx.com/a.png'},  // 图片
   * ]);
   *
   * @param options 替换文本参数的数组
   */
  async replace(options: ReplaceOptionType) {
    // TODO
    // await this.ready('AnimationLoaded');
    // if (this.anim?.renderer.renderConfig.progressiveLoad) {
    //   throw new Error('开启 progressiveLoad 时无法进行动态替换');
    // }
    // if (!this.anim) {
    //   throw new Error(
    //     `Lolita anim 已销毁，请检查调用关系是否正常, config: ${JSON.stringify(options)}`,
    //   );
    // }
    // // 归一化参数，支持简单的键值对结构（此时 key 为 name，不支持 path）
    // let data: ReplaceOption[];
    // if (options instanceof Array) {
    //   data = options;
    // } else {
    //   data = Object.keys(options).map((name) => {
    //     return { name, value: options[name] };
    //   });
    // }

    // data.forEach(({ name, path, value }) => {
    //   if (name) {
    //     path = find(this.paths, (i) => i.name === name)?.path || path;
    //   }
    //   if (!path) {
    //     throw new Error(
    //       name ? `未找到 ${name} 对应的 path 定义` : 'path 未传入',
    //     );
    //   }
    //   const elements = util.findElementsByPath(
    //     this.anim?.renderer.elements,
    //     path,
    //   );

    //   if (elements.length === 0) {
    //     console.error(`replace ${path} not found`);
    //     return;
    //   }

    //   elements.forEach((ele) => {
    //     // 判断是替换文字 or 图片
    //     const layerType = ele.data.ty;
    //     if (layerType === LayerTypeEnum.TEXT) {
    //       if (this.anim?.renderer.rendererType === 'canvas') {
    //         // canvas 下不支持文本
    //         throw new Error('canvas 模式下不支持文本替换');
    //       }
    //       ele.updateDocumentData({ t: value });
    //       logger.debug(`[lolita replace][svg] ${path}: ${value}`);
    //     } else if (layerType === LayerTypeEnum.IMAGE) {
    //       if (this.anim?.renderer.rendererType === 'canvas') {
    //         // canvas 模式下替换图片
    //         ele.img.src = value;
    //       } else {
    //         // svg 模式下替换图片，innerElem 是内部的 image 元素
    //         ele.innerElem.setAttributeNS(
    //           'http://www.w3.org/1999/xlink',
    //           'href',
    //           value,
    //         );
    //       }
    //       logger.debug(`[lolita replace] ${path}: ${value}`);
    //     } else {
    //       logger.warn(
    //         `[lolita replace] ${path} 类型为 ${layerType}，不支持替换`,
    //       );
    //     }
    //   });
    // });
  }

  /**
   * 提供 Lottie 固定帧 API
   * @param value numeric value.
   * @param isFrame defines if first argument is a time based value or a frame based (default false).
   */
  async goToAndStop(value: number, isFrame: boolean) {
    await this.ready('AnimationLoaded');
    if (!this.anim) {
      throw new Error('Lolita anim 已销毁，请检查调用关系是否正常');
    }
    this.setVisible(true);
    this.anim.goToAndStop(value, isFrame);
    // logger.debug(`[lolita goToAndStop] ${value} ${isFrame}`);
  }

  /**
   * 为合成绑定 click 事件
   * @param layerClickOptions lolita path name -> fn 的键值对
   */
  async addLayerClickListener(layerClickOptions: LayerClickOptions) {
    // TODO
    // await this.ready('AnimationLoaded');
    // if (this.anim?.renderer.renderConfig.progressiveLoad) {
    //   throw new Error('开启 progressiveLoad 时无法绑定 layer 的 click 事件');
    // }
    // if (this.anim?.renderer.rendererType === 'canvas') {
    //   throw new Error('canvas 模式下不支持 layer 的 click 事件');
    // }
    // Object.keys(layerClickOptions).forEach((name) => {
    //   const path = find(this.paths, (i) => i.name === name)?.path;
    //   if (!path) {
    //     return;
    //   }

    //   const elements = util.findElementsByPath(
    //     this.anim?.renderer.elements,
    //     path,
    //   );
    //   if (elements.length === 0) {
    //     // TODO 后续统一抛出异常
    //     console.error(`addLayerClickListener ${path} not found`);
    //     return;
    //   }
    //   elements.forEach((ele) => {
    //     const layerType = ele.data.ty;
    //     if (
    //       layerType === LayerTypeEnum.TEXT ||
    //       layerType === LayerTypeEnum.IMAGE ||
    //       layerType === LayerTypeEnum.PRECOMPOSITION
    //     ) {
    //       ele.baseElement.style.cursor = 'pointer';
    //       ele.baseElement.addEventListener(
    //         'click',
    //         layerClickOptions[name],
    //         false,
    //       );
    //       this.layerClickListeners.push([
    //         ele.baseElement,
    //         layerClickOptions[name],
    //       ]);
    //     } else {
    //       logger.warn(
    //         `[lolita addLayerClickListener] 点击事件暂不支持该类型 ${layerType}`,
    //       );
    //     }
    //   });
    // });
  }

  /**
   * 解绑所有的合成的 click 事件
   */
  removeLayerClickListeners() {
    // TODO
    // this.layerClickListeners.forEach(([element, fn]) => {
    //   element.removeEventListener('click', fn, false);
    // });
    // this.layerClickListeners.length = 0;
  }

  stop() {
    // Lolita anim 已销毁
    if (!this.anim) return;
    // 移除所有监听防止依然在执行的动画有问题，联动 playSegments 内部实现
    this.anim.removeEventListener('complete', undefined);
    // NOTE 这里不能使用 stop API 方法
    // 因为 stop 会让 Lottie 回到当前播放片段的初始帧
    // 导致针对后续连贯播放会有跳帧问题
    this.anim.pause();
  }

  async pause() {
    await this.ready('AnimationLoaded');
    this.anim?.pause();
  }

  async play() {
    await this.ready('AnimationLoaded');
    this.anim?.play();
  }

  async togglePause() {
    await this.ready('AnimationLoaded');
    this.anim?.togglePause();
  }

  // 处理 Lottie 销毁逻辑
  destroy() {
    // Lolita anim 已销毁
    if (!this.anim) return;
    this.stop();
    this.anim.destroy();
    this.anim = undefined;
    this.ee.removeAllListeners();
    // logger.debug(`[lolita destroy]`);
  }

  static loadAnimation<T extends typeof Lolita>(
    this: T,
    {
      path,
      animationData,
      container,
      config = {},
      precompile,
      deviceLevel,
      ...restProps
    }: LolitaConstructorOption,
  ): InstanceType<T> {
    const item = new this({
      path,
      animationData,
      container,
      config,
      precompile,
      deviceLevel,
      ...restProps,
    }) as InstanceType<T>;
    return item;
  }

  // static set logLevel(level: LogLevel) {
  //   logger.level = level;
  // }

  static util = util;
}

export { util };
export default Lolita;

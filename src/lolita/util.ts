import type { WidePlayOption, PlayOptionType, PlayOption, AnimationSegment } from './types';

export const PATH_KEY = 'lolitaPaths';
export const ANIMATION_KEY = 'lolitaAnimations';
export const DEGRADE_KEY = 'lolitaDegrades';

export async function fetchJSON(path: string) {
  let json;
  try {
    const resp = await fetch(path);
    if (!resp.ok) {
      throw new Error(resp.status + '');
    }
    json =  resp.json();
  } catch(e: unknown) {
    if (e instanceof Error) {
      throw new Error(`FetchError ${path}: ${e.message}`);
    }
  }
  return json;
}

export function normalizePlayOptions(play: PlayOptionType, animations: any, fr = 60): PlayOption[] {
  // 1. 对播放配置归一化
  let config: WidePlayOption[];
  if (typeof play === 'string') {
    // play 支持 string
    config = [{ name: play }];
  } else if (Array.isArray(play)) {
    config = play;
  } else {
    config = [play];
  }
  
  if (config.length <= 0) {
    return [];
  }

  // 2. 补齐所有相关数据
  const result = config
    .map((playOption) => {
      const { playCount = 1, speed = 1, direction = 1, onStart, onComplete } = playOption;
      let segments: AnimationSegment;
      if ('segments' in playOption) {
        segments = playOption.segments;
      } else {
        const animation = animations.find((a: any) => a.name === playOption.name);
        if (!animation) {
          return null;
        }
        segments = [animation.start, animation.end];
      }
      
      let duration;
      if (playCount === 0) {
        duration = Number.MAX_SAFE_INTEGER;
      } else {
        duration = (Math.abs(segments[1] - segments[0]) * playCount * 1000) / speed / (fr || 60); // 计算播放时间
      }
      return {
        playCount,
        speed,
        direction,
        onStart,
        onComplete,
        segments,
        duration,
      };
    });

  return result.filter((r) => r !== null) as PlayOption[];
};
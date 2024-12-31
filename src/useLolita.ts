import { useEffect, useRef, useCallback, useReducer } from 'react';
import Lolita from './lolita';

export interface UseLolitaProps {
  path?: string;
  animationData?: any;
  [name: string]: any; // 支持传入其他数据，用于构造 lolita 对象
}

export interface LolitaController {
  (lolita: Lolita, lolitaChanged?: boolean): void;
}

const useLolita = (
  controller: LolitaController,
  {
    needDowngrade = false,
    path,
    animationData,
    ...rest
  }: UseLolitaProps,
  deps: any[] = [],
) => {
  const [, forceUpdate] = useReducer((x) => x + 1, 0); // 解决 ref 更新不触发 useEffect 的问题
  const ref = useRef<HTMLDivElement | null>();
  const lolitaRef = useRef<Lolita | null>();
  const prevPathRef = useRef<String | null>();
  const prevAnimationDataRef = useRef<any>();
  const prevDepsRef = useRef<any[]>();
  
  const destroyLolita = () => {
    if (!lolitaRef.current) {
      return;
    }
    // lolitaRef.current.removeLayerClickListeners();
    lolitaRef.current.destroy();
    lolitaRef.current = null;

    // logger.info('[useLolita] destroy lolita');
  };

  // ref: https://medium.com/@teh_builder/ref-objects-inside-useeffect-hooks-eb7c15198780
  const setRef = useCallback((node: HTMLDivElement) => {
    if (ref.current) {
      destroyLolita();
    }
    ref.current = node;
    forceUpdate();
  }, []);

  useEffect(() => {
    if (
      !ref.current ||
      (!path && !animationData)
    ) {
      return;
    }
    const lolitaChanged =
      path !== prevPathRef.current ||
      animationData !== prevAnimationDataRef.current;
    if (lolitaChanged) {
      // logger.info(
      //   `[useDowngadeLolita] needDowngrade: ${needDowngrade}, downgradeType: ${downgradeType}, downgradeFrame: ${downgradeFrame}`,
      // );
      lolitaRef.current?.destroy();
      lolitaRef.current = Lolita.loadAnimation({
        container: ref.current,
        path,
        animationData,
        ...rest,
      });
      prevPathRef.current = path;
      prevAnimationDataRef.current = animationData;
    }
    // deps 目前是 [play, replaceData, onLayerClick]
    const depsChanged = deps.some((dep, index) => {
      return prevDepsRef.current?.[index] !== dep;
    });
    if (lolitaRef.current && (depsChanged || lolitaChanged)) {
      prevDepsRef.current = deps;

      controller(lolitaRef.current, lolitaChanged);
    }
  }, [...deps, ref.current, path, animationData]);

  useEffect(
    () => () => {
      lolitaRef.current?.destroy();
    },
    [],
  );

  return { ref: setRef, lolitaRef };
};

export default useLolita;

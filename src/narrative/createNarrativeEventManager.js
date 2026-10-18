import * as THREE from "three";
import { NARRATIVE_EVENTS, NARRATIVE_LIMITS } from "./narrativeEventConfig.js";
import { createNarrativeResources } from "./createNarrativeResources.js";
import { createAtmosphericEvent } from "./createAtmosphericEvent.js";
import { createBranchEvent } from "./createBranchEvent.js";
import { createPainterlyEvent } from "./createPainterlyEvent.js";
import { createCompanionEvent } from "./createCompanionEvent.js";
/** Bubble preparation is separate from playback; no timer or flight ownership. */
export function createNarrativeEventManager({
  factories = {},
  limits = {},
  durationScale = 1,
} = {}) {
  const budget = { ...NARRATIVE_LIMITS, ...limits },
    group = new THREE.Group(),
    active = [],
    persistent = [],
    seen = new Set();
  const registry = {
    companions: createCompanionEvent,
    atmosphere: createAtmosphericEvent,
    branch: createBranchEvent,
    painterly: createPainterlyEvent,
    ...factories,
  };
  let resources = null,
    prepared = null,
    queued = null,
    disposed = false,
    started = 0;
  const stats = {
    active: 0,
    persistent: 0,
    queued: 0,
    prepared: null,
    started: 0,
    companions: 0,
  };
  const effects = { spiral: 0, contrast: 0, opening: 0, time: 0 };
  const memory = {
    branch: null,
    cloud: null,
    paths: null,
    pathCount: 0,
    companionPoses: {},
  };
  function refresh() {
    stats.active = active.length;
    stats.persistent = persistent.length;
    stats.queued = queued ? 1 : 0;
    stats.prepared = prepared?.id || null;
    stats.started = started;
    stats.companions = active.reduce(
      (n, x) => n + (x.event.companionCount || 0),
      0,
    );
  }
  function begin(config, ctx) {
    ctx.memory = memory;
    const factory = registry[config.type];
    if (!factory) return false;
    const event = factory(
      config,
      ctx,
      (resources ??= createNarrativeResources()),
    );
    group.add(event.object);
    active.push({ config, event, age: 0, retiring: 0 });
    started++;
    refresh();
    return true;
  }
  function trigger(config, ctx) {
    if (!config || disposed || seen.has(config.id)) return false;
    seen.add(config.id);
    const sameCompanion = active.find(
      (x) =>
        (config.type === "companions" && x.config.type === "companions") ||
        (["old-cloud", "silent-cloud"].includes(config.variant) &&
          ["old-cloud", "silent-cloud"].includes(x.config.variant)),
    );
    if (active.length >= budget.active || sameCompanion) {
      const old = sameCompanion || active[0];
      old.retiring = old.retiring || 1.5;
      queued = config;
      refresh();
      return true;
    }
    return begin(config, ctx);
  }
  return {
    group,
    stats,
    effects,
    get isPerched() {
      return active.some((x) => x.event.perched);
    },
    releasePerch() {
      for (const x of active) x.event.releasePerch?.();
    },
    get activeIds() {
      return active.map((x) => x.config.id);
    },
    prepare(bubbleId) {
      if (disposed) return false;
      prepared =
        NARRATIVE_EVENTS.find(
          (x) => x.bubbleId === bubbleId && !seen.has(x.id),
        ) || null;
      refresh();
      return Boolean(prepared);
    },
    resume(ctx) {
      const next = prepared;
      prepared = null;
      return trigger(next, ctx);
    },
    trigger(id, ctx) {
      return trigger(
        NARRATIVE_EVENTS.find((x) => x.id === id),
        ctx,
      );
    },
    update(dt, ctx) {
      if (disposed) return;
      dt = Math.max(0, Math.min(0.1, dt));
      ctx.memory = memory;
      effects.time += dt;
      effects.spiral = effects.contrast = effects.opening = 0;
      for (let i = active.length - 1; i >= 0; i--) {
        const item = active[i];
        item.age += dt;
        const duration = item.config.duration * durationScale;
        if (item.retiring)
          item.retiring = Math.max(0.00001, item.retiring - dt);
        const remaining = item.retiring || duration - item.age;
        const opacity =
          THREE.MathUtils.smoothstep(item.age, 0, 2) *
          (item.config.persistent && !item.retiring
            ? 1
            : THREE.MathUtils.smoothstep(
                remaining,
                0,
                item.retiring ? 1.5 : 3,
              ));
        item.event.update(item.age, dt, ctx, opacity, effects);
        if (item.age >= duration || item.retiring === 0.00001) {
          active.splice(i, 1);
          if (
            !item.retiring &&
            item.config.persistent &&
            item.event.retain?.()
          ) {
            persistent.push(item.event);
            while (persistent.length > budget.persistent)
              persistent.shift().dispose();
          } else item.event.dispose();
        }
      }
      if (
        queued &&
        active.length < budget.active &&
        !active.some(
          (x) => queued.type === "companions" && x.config.type === "companions",
        )
      ) {
        const next = queued;
        queued = null;
        begin(next, ctx);
      }
      refresh();
    },
    finish() {
      for (const item of active) {
        if (item.config.persistent && item.event.retain?.())
          persistent.push(item.event);
        else item.event.dispose();
      }
      active.length = 0;
      prepared = queued = null;
      while (persistent.length > budget.persistent)
        persistent.shift().dispose();
      effects.spiral = effects.contrast = effects.opening = 0;
      refresh();
    },
    clear() {
      for (const x of active) x.event.dispose();
      for (const x of persistent) x.dispose();
      active.length = persistent.length = 0;
      seen.clear();
      memory.branch = memory.cloud = memory.paths = null;
      memory.pathCount = 0;
      memory.companionPoses = {};
      prepared = queued = null;
      effects.spiral = effects.contrast = effects.opening = 0;
      started = 0;
      effects.time = 0;
      refresh();
    },
    dispose() {
      this.clear();
      disposed = true;
      resources?.dispose();
      resources = null;
      group.removeFromParent();
    },
  };
}

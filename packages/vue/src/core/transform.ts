import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createPrefixCommentOfGenFile } from './comment';
import { ensureFile } from '../shared/fs';
import type { ElegantVueRouterOption } from '../types';

/**
 * generate the transform file
 * @param options
 */
export async function genTransformFile(options: ElegantVueRouterOption) {
  const code = getTransformCode();

  const transformPath = path.posix.join(options.cwd, options.transformDir);

  await ensureFile(transformPath);

  await writeFile(transformPath, code);
}

function getTransformCode() {
  const prefixComment = createPrefixCommentOfGenFile();

  const code = `${prefixComment}

import type { RouteRecordRaw, RouteComponent } from 'vue-router';
import type { ElegantConstRoute } from '@elegant-router/vue';

/**
 * transform elegant const routes to vue routes
 * @param routes elegant const routes
 * @param layouts layout components
 * @param views view components
 */
export function transformElegantRoutesToVueRoutes(
  routes: ElegantConstRoute[],
  layouts: Record<string, RouteComponent | (() => Promise<RouteComponent>)>,
  views: Record<string, RouteComponent | (() => Promise<RouteComponent>)>
) {
  return routes.flatMap(route => transformElegantRouteToVueRoute(route, layouts, views));
}

/**
 * transform elegant route to vue route
 * @param route elegant const route
 * @param layouts layout components
 * @param views view components
 */
function transformElegantRouteToVueRoute(
  route: ElegantConstRoute,
  layouts: Record<string, RouteComponent | (() => Promise<RouteComponent>)>,
  views: Record<string, RouteComponent | (() => Promise<RouteComponent>)>
) {
  const LAYOUT_PREFIX = 'layout.';
  const VIEW_PREFIX = 'view.';
  const ROUTE_DEGREE_SPLITTER = '_';
  const FIRST_LEVEL_ROUTE_COMPONENT_SPLIT = '$';

  function isLayout(component: string) {
    return component.startsWith(LAYOUT_PREFIX);
  }

  function getLayoutName(component: string) {
    return component.replace(LAYOUT_PREFIX, '');
  }

  function isView(component: string) {
    return component.startsWith(VIEW_PREFIX);
  }

  function getViewName(component: string) {
    return component.replace(VIEW_PREFIX, '');
  }

  function isFirstLevelRoute(item: ElegantConstRoute) {
    return !item.name.includes(ROUTE_DEGREE_SPLITTER);
  }

  function isSingleLevelRoute(item: ElegantConstRoute) {
    return isFirstLevelRoute(item) && !item.children?.length;
  }

  function getSingleLevelRouteComponent(component: string) {
    const [layout, view] = component.split(FIRST_LEVEL_ROUTE_COMPONENT_SPLIT);

    return {
      layout: getLayoutName(layout),
      view: getViewName(view)
    };
  }

  const vueRoutes: RouteRecordRaw[] = [];

  const { name, path, component, children, ...rest } = route;

  const vueRoute = { name, path, ...rest } as RouteRecordRaw;

  if (component) {
    if (isSingleLevelRoute(route)) {
      const { layout, view } = getSingleLevelRouteComponent(component);

      const singleLevelRoute: RouteRecordRaw = {
        path,
        component: layouts[layout],
        children: [
          {
            name,
            path: '',
            component: views[view],
            ...rest
          } as RouteRecordRaw
        ]
      };

      return [singleLevelRoute];
    }

    if (isLayout(component)) {
      const layoutName = getLayoutName(component);

      vueRoute.component = layouts[layoutName];
    }

    if (isView(component)) {
      const viewName = getViewName(component);

      vueRoute.component = views[viewName];
    }

  }
  
  // add redirect to child
  if (children?.length) {
    vueRoute.redirect = {
      name: children[0].name
    };
  }
  
  if (children?.length) {
    const childRoutes = children.flatMap(child => transformElegantRouteToVueRoute(child, layouts, views));

    if(isFirstLevelRoute(route)) {
      vueRoute.children = childRoutes;
    } else {
      vueRoutes.push(...childRoutes);
    }
  }

  vueRoutes.unshift(vueRoute);

  return vueRoutes;
}  

`;

  return code;
}
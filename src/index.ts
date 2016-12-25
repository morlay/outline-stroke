import * as SVGPath from "svgpath";

import {
  Path,
  StrokeLinecaps,
  StrokeLinejoins,
} from "./Vector";

export interface IStrokeAttrs {
  width?: number;
  linecap?: "butt" | "square" | "round" ; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap
  linejoin?: "miter" | "round" | "bevel" ; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linejoin
  // miterlimit?: number; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-miterlimit
  // dasharray?: string; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dasharray
  // dashoffset?: string; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-dashoffset
  // color?: any; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke
  // opacity?: any; // https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-opacity
}

export const outlineStroke = (pathString: string, strokeAttrs: IStrokeAttrs) => {
  const svgPath = (new SVGPath(pathString))
    .unarc()
    .unshort()
    .abs();

  const radius = strokeAttrs.width / 2;

  const path = Path.fromSvgSegments((svgPath as any).segments as any[], StrokeLinejoins[strokeAttrs.linejoin || "miter"]);

  return new SVGPath(
    path.outline(radius, StrokeLinecaps[strokeAttrs.linecap || "butt"])
  ).round(2).toString().toString();
};

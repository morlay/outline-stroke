import { test } from "ava";
import { outputFile } from "fs-extra";
import * as _ from "lodash";

import {
  IStrokeAttrs,
  outlineStroke,
} from "../index";

const cases = [{
  name: "simple-line",
  d: "M50,50L350,350",
  width: 20,
}, {
  name: "simple-line-with-round-cap",
  d: "M50,50L350,350",
  width: 20,
  linecap: "round",
}, {
  name: "simple-line-with-square-cap",
  d: "M50,50L350,350",
  width: 20,
  linecap: "square",
}, {
  name: "multi-line",
  d: "M50,50L150,150L150,200",
  width: 20,
}, {
  name: "multi-line-2",
  d: "M50,50L150,150L150,50",
  width: 20,
}, {
  name: "multi-line-with-round-join",
  d: "M50,50L150,150L150,200",
  width: 20,
  linejoin: "round",
}, {
  name: "rect",
  d: "M50,50H150V150H50V60",
  width: 20,
}, {
  name: "multi-line-with-round-join-2",
  d: "M50,50L150,150L150,50",
  width: 20,
  linejoin: "round",
}, {
  name: "multi-line-with-round-join-3",
  d: "M50,50L150,150L250,250",
  width: 20,
  linejoin: "round",
}, {
  name: "multi-line-with-closed",
  d: "M200,200L50,50H100Z",
  width: 20,
  linejoin: "round",
}, {
  name: "multi-line-with-bevel-join",
  d: "M50,50L150,150L150,200",
  width: 20,
  linejoin: "bevel",
}, {
  name: "simple-quadratic-curve",
  d: "M50,50 Q100,150,150,50",
  width: 20,
}, {
  name: "simple-curve",
  d: "M50,50 C200,200,300,200,300,50",
  width: 20,
}, {
  name: "simple-curve-with-square-cap",
  d: "M50,50 C200,200,300,200,300,50",
  linecap: "square",
  width: 20,
}, {
  name: "simple-curve-with-square-round",
  d: "M50,50 c1.8,18.7-11.6,41.4-11.6,41.4",
  linecap: "round",
  width: 20,
}, {
  name: "curve-with-line",
  d: "M50,50 C200,200,300,200,300,50 L150,150",
  width: 20,
}, {
  name: "curve-with-curve",
  d: "M50,50 C200,200,300,200,300,50 c20,-20,30,-30,-100,0",
  width: 20,
}];

const toSvgExample = (name: string, src: string, result: string, strokeAttrs: IStrokeAttrs): string => `
<div id="${name}" style="position: relative; width: 800px">
  <a href="#${name}" style="position: relative; top:0; left:0">${name}</a>
  <svg xmlns="http://www.w3.org/2000/svg" version="1.1" viewBox="0 0 400 400">
      <path 
        d="${src}" 
        fill="none" 
        stroke="grey" 
        stroke-width="${strokeAttrs.width}" 
        stroke-linecap="${strokeAttrs.linecap}" 
        stroke-linejoin="${strokeAttrs.linejoin}"
      />
      <path fill="none" stroke="yellow" stroke-width="1" d="${src}" />
      <path fill="red" opacity="0.5" d="${result}" />
  </svg>
</div>
`;

test("", () => {
  let casesNeedToTest = _.filter(cases, (caseItem: any) => caseItem.only);

  if (_.isEmpty(casesNeedToTest)) {
    casesNeedToTest = cases;
  }

  const svgList = _.map(
    casesNeedToTest, (caseItem) => {
      const result = outlineStroke(caseItem.d, caseItem as IStrokeAttrs);
      return toSvgExample(caseItem.name, caseItem.d, result, caseItem as IStrokeAttrs);
    });

  outputFile(
    `${process.cwd()}/examples/index.html`,
    svgList.join("\n")
  );
});
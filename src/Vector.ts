///<reference path="../@types/bezier-js/index.d.ts"/>

import * as BezierJS from "bezier-js";
import * as _ from "lodash";

const ANGLE_RADIAN = 180 / Math.PI;

export enum StrokeLinecaps {
  butt,
  square,
  round,
}

export enum StrokeLinejoins {
  miter,
  round,
  bevel,
}

export class Point {
  public r: number;
  public theta: number;

  static fromPointLike = (point: { x: number, y: number }): Point => {
    return new Point(
      point.x,
      point.y,
    );
  };

  static fromPolar = (theta: number, r: number): Point => {
    return new Point(
      r * Math.cos(theta / ANGLE_RADIAN),
      r * Math.sin(theta / ANGLE_RADIAN),
    );
  };

  constructor(public x: number, public y: number) {
    this.x = x;
    this.y = y;
    this.r = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2));
    this.theta = Math.atan2(y, x) * ANGLE_RADIAN;
  }

  setTheta(theta: number): Point {
    return Point.fromPolar(theta, this.r);
  }

  setR(r: number): Point {
    return Point.fromPolar(this.theta, r);
  }

  setX(x: number): Point {
    return new Point(x, this.y);
  }

  setY(y: number): Point {
    return new Point(this.x, y);
  }

  eql(point: Point): boolean {
    return this.x.toPrecision(2) == point.x.toPrecision(2)
      && this.y.toPrecision(2) == point.y.toPrecision(2);
  }

  add(point: Point): Point {
    return new Point(
      point.x + this.x,
      point.y + this.y,
    )
  }

  sub(point: Point): Point {
    return new Point(
      this.x - point.x,
      this.y - point.y,
    )
  }

  center(point: Point): Point {
    const delta = this.sub(point);

    return new Point(
      this.x - delta.x / 2,
      this.y - delta.y / 2,
    )
  }

  scale(value: number): Point {
    return new Point(
      this.x * value,
      this.y * value
    );
  }

  distance(point: Point) {
    const delta = this.sub(point);
    return delta.r;
  }

  print() {
    return `${this.x}, ${this.y}`;
  }

}

export abstract class Seg {
  private command: "Q" | "C" | "L";
  public points: Point[];

  abstract offset(radius: number): Path;

  abstract reversePoints(): Seg;

  setCommand(command: "Q" | "C" | "L") {
    this.command = command;
  }

  print() {
    return _.map(this.points, (point) => point.print()).join(" ");
  }

  setPoints(points: Point[]) {
    this.points = points;
  }

  getFirstPoint() {
    return _.first(this.points);
  }

  getLastPoint() {
    return _.last(this.points);
  }

  intersects(seg: Seg): {
    splits: [number, number],
    point: Point
  } | null {
    const curve = this.toBezier();
    const pairs = curve.intersects(seg.toBezier());

    if (pairs.length === 0) {
      return null;
    }

    const splits = String(pairs[0])
      .split("/")
      .map((val: string) => parseFloat(val)) as [number, number];

    return {
      splits: splits,
      point: Point.fromPointLike(curve.get(splits[0]))
    };
  };

  extendIntersects(seg: Seg): Point {
    const len = this.points.length;

    const firstPoint = this.points[len - 2];
    const lastPoint = this.points[len - 1];

    const x1 = firstPoint.x;
    const y1 = firstPoint.y;
    const x2 = lastPoint.x;
    const y2 = lastPoint.y;

    const firstPoint1 = seg.points[0];
    const lastPoint1 = seg.points[1];

    const x3 = firstPoint1.x;
    const y3 = firstPoint1.y;
    const x4 = lastPoint1.x;
    const y4 = lastPoint1.y;

    const d = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

    if (d) {
      return new Point(
        ((x1 * y2 - y1 * x2) * (x3 - x4) - (x1 - x2) * (x3 * y4 - y3 * x4)) / d,
        ((x1 * y2 - y1 * x2) * (y3 - y4) - (y1 - y2) * (x3 * y4 - y3 * x4)) / d,
      );
    }

    return null;
  }

  toBezier(): Bezier {
    return new BezierJS(this.points);
  }

  toSvg(isFirst: boolean): string {
    const svg = `${this.command} ${_.map(_.tail(this.points), (point) => `${point.x},${point.y}`).join(" ")}`;

    if (isFirst) {
      const startPoint = this.getFirstPoint();

      return `M${startPoint.x},${startPoint.y} ${svg}`;
    }

    return svg;
  }
}

export class Line extends Seg {
  constructor(startPoint: Point, endPoint: Point) {
    super();
    this.setCommand("L");
    this.setPoints([
      startPoint,
      endPoint,
    ]);
  }

  reversePoints() {
    const newPoints = _.reverse(this.points);
    return new Line(newPoints[0], newPoints[1]);
  }

  toBezier(): Bezier {
    const firstPoint = this.points[0];
    const lastPoint = this.points[1];

    const delta = lastPoint.sub(firstPoint);

    return new BezierJS([
      firstPoint,
      firstPoint.add(delta.setTheta(delta.theta + 0.001)),
      lastPoint,
      lastPoint,
    ]);
  }

  offset(radius: number): Path {
    const r = Math.abs(radius);
    const startPoint = this.getFirstPoint();
    const endPoint = this.getLastPoint();

    const delta = endPoint
      .sub(startPoint)
      .setR(r);

    const position = radius / r;

    return new Path([
      new Line(
        startPoint.add(delta.setTheta(delta.theta + position * 90)),
        endPoint.add(delta.setTheta(delta.theta + position * 90)),
      )
    ]);
  }
}

export class CubicBezier extends Seg {
  constructor(startPoint: Point, startControlPoint: Point, endControlPoint: Point, endPoint: Point) {
    super();
    this.setCommand("C");
    this.setPoints([
      startPoint,
      startControlPoint,
      endControlPoint,
      endPoint,
    ]);
  }

  reversePoints() {
    const newPoints = _.reverse(this.points);
    return new CubicBezier(newPoints[0], newPoints[1], newPoints[2], newPoints[3]);
  }

  offset(radius: number): Path {
    return new Path(
      (this.toBezier()
        .offset(radius) as Bezier[])
        .map((bezier: Bezier) => {
          const points = bezier.points;

          return new CubicBezier(
            new Point(points[0].x, points[0].y),
            new Point(points[1].x, points[1].y),
            new Point(points[2].x, points[2].y),
            new Point(points[3].x, points[3].y),
          )
        })
    );
  }
}

export class QuadraticBezier extends Seg {
  constructor(startPoint: Point, controlPoint: Point, endPoint: Point) {
    super();
    this.setCommand("Q");
    this.setPoints([
      startPoint,
      controlPoint,
      endPoint,
    ]);
  }

  reversePoints() {
    const newPoints = _.reverse(this.points);
    return new QuadraticBezier(newPoints[0], newPoints[1], newPoints[2]);
  }

  offset(radius: number): Path {
    const beziers = this.toBezier().offset(radius) as any[];

    return new Path(
      beziers
        .map((bezier: any) => {
          const points = bezier.points;

          return new QuadraticBezier(
            new Point(points[0].x, points[0].y),
            new Point(points[1].x, points[1].y),
            new Point(points[2].x, points[2].y),
          )
        })
    );
  }
}

const getControlPoint = (startPoint: Point, endPoint: Point) => {
  const r = endPoint.distance(startPoint) / 2;
  const centerPoint = startPoint.center(endPoint);
  const deltaPoint = centerPoint.sub(startPoint);
  return centerPoint.add(deltaPoint.setR(r).setTheta(deltaPoint.theta + 90));
};

const getHalfPoint = (firstPoint: Point, lastPoint: Point, centerPoint: Point): Point => {
  const deltaCenter1 = firstPoint.sub(centerPoint);
  const deltaCenter2 = lastPoint.sub(centerPoint);
  return centerPoint.add(deltaCenter1.setTheta(deltaCenter1.theta + ((Math.abs(deltaCenter2.theta - deltaCenter1.theta) > 180 ? 360 : 0) + (deltaCenter2.theta - deltaCenter1.theta)) / 2));
};

const getQuadraticBezier = (firstPoint: Point, centerPoint: Point, lastPoint: Point,): QuadraticBezier => {
  const points = BezierJS.quadraticFromPoints(
    firstPoint,
    centerPoint,
    lastPoint,
    0.5,
  ).points;

  const finalPoints = _.map(points, (point: { x: number, y: number }) => Point.fromPointLike(point));

  return new QuadraticBezier(finalPoints[0], finalPoints[1], finalPoints[2]);
};

export class Path {
  constructor(public segs: Seg[], public closed?: boolean, public linejoin?: StrokeLinejoins) {
    this.linejoin = linejoin || StrokeLinejoins.miter;
    this.closed = closed || false;
    this.segs = segs || [];
  };

  static connectPatchWhenNeed = (segs: Seg[], isClosed: boolean, linejoin: StrokeLinejoins): Seg[] => {
    const getPatchedSegs = (prevSeg: Seg, seg: Seg): [boolean, Seg[]] => {
      if (prevSeg && !prevSeg.getLastPoint().eql(seg.getFirstPoint())) {
        const connection = prevSeg.intersects(seg);

        if (connection) {
          const connectPoint = connection.point;

          const connectPaths = [];

          if (prevSeg instanceof Line) {
            connectPaths.push(new Line(prevSeg.getFirstPoint(), connectPoint));
          } else {
            const curve = new BezierJS(prevSeg.points);
            const newCurve = curve.split(0, connection.splits[0]);
            connectPaths.push(new CubicBezier(
              Point.fromPointLike(newCurve.points[0]),
              Point.fromPointLike(newCurve.points[1]),
              Point.fromPointLike(newCurve.points[2]),
              Point.fromPointLike(newCurve.points[3]),
            ));
          }

          if (seg instanceof Line) {
            connectPaths.push(new Line(connectPoint, seg.getLastPoint()));
          } else {
            const curve = new BezierJS(seg.points);
            const newCurve = curve.split(connection.splits[1], 1);
            connectPaths.push(new CubicBezier(
              Point.fromPointLike(newCurve.points[0]),
              Point.fromPointLike(newCurve.points[1]),
              Point.fromPointLike(newCurve.points[2]),
              Point.fromPointLike(newCurve.points[3]),
            ));
          }

          return [true, connectPaths];

        } else {
          const connectPoint = prevSeg.extendIntersects(seg);

          if (connectPoint) {
            if (linejoin === StrokeLinejoins.round) {
              const startPoint = prevSeg.getLastPoint();
              const endPoint = seg.getFirstPoint();

              const deltaStart = connectPoint.sub(startPoint);
              const deltaEnd = connectPoint.sub(endPoint);

              const circleCenterPoint = new Line(startPoint, startPoint.add(deltaStart.setTheta(deltaStart.theta + 90)))
                .extendIntersects(new Line(endPoint, endPoint.add(deltaEnd.setTheta(deltaEnd.theta + 90))));

              const halfPoint = getHalfPoint(startPoint, endPoint, circleCenterPoint);

              const firstHalfPoint = getHalfPoint(startPoint, halfPoint, circleCenterPoint);
              const lastHalfPoint = getHalfPoint(halfPoint, endPoint, circleCenterPoint);

              return [
                false, [
                  getQuadraticBezier(startPoint, firstHalfPoint, halfPoint),
                  getQuadraticBezier(halfPoint, lastHalfPoint, endPoint),
                  seg,
                ]];
            }

            if (linejoin === StrokeLinejoins.bevel) {
              return [false, [
                new Line(prevSeg.getLastPoint(), seg.getFirstPoint()),
                seg,
              ]];
            }

            return [false, [
              new Line(prevSeg.getLastPoint(), connectPoint),
              new Line(connectPoint, seg.getFirstPoint()),
              seg,
            ]];
          }
        }
      }
      return [false, [seg]];
    };

    const result = _.reduce(segs, (finalSegs, seg: Seg) => {
      const [needToOverwritePrev, connectSegs] = getPatchedSegs(_.last<Seg>(finalSegs), seg);

      if (needToOverwritePrev) {
        return _.take(finalSegs, finalSegs.length - 1).concat(connectSegs);
      }

      return finalSegs.concat(connectSegs);
    }, []);

    if (isClosed) {
      const firstSeg = _.first(result);
      const lastSeg = _.last(result);

      if (!firstSeg.getLastPoint().eql(lastSeg.getFirstPoint())) {

        const otherSegs = _.tail(_.take(result, result.length - 1));

        const [needToOverwritePrev, connectSegs] = getPatchedSegs(lastSeg, firstSeg);

        if (needToOverwritePrev) {
          return [].concat(connectSegs).concat(otherSegs);
        }

        return [lastSeg].concat(connectSegs).concat(otherSegs);
      }
    }

    return result;
  };

  static getLinecapPath = (startPoint: Point, endPoint: Point, linecap: StrokeLinecaps) => {
    switch (linecap) {
      case StrokeLinecaps.round:
        const centerPoint = getControlPoint(startPoint, endPoint);
        const centerPointStart = getControlPoint(startPoint, centerPoint);
        const centerPointEnd = getControlPoint(centerPoint, endPoint);

        return new Path([
          new CubicBezier(
            startPoint,
            startPoint.center(centerPointStart),
            centerPointStart.center(centerPoint),
            centerPoint
          ),
          new CubicBezier(
            centerPoint,
            centerPoint.center(centerPointEnd),
            centerPointEnd.center(endPoint),
            endPoint,
          ),
        ]);
      case StrokeLinecaps.square:
        const r = endPoint.distance(startPoint) / 2;

        const lineOffset = new Line(
          startPoint,
          endPoint,
        )
          .offset(r)
          .getFirstSeg();

        return new Path([
          new Line(
            startPoint,
            lineOffset.getFirstPoint(),
          ),
          lineOffset,
          new Line(
            lineOffset.getLastPoint(),
            endPoint,
          ),
        ]);
      case StrokeLinecaps.butt:
      default:
        return new Path([
          new Line(
            startPoint,
            endPoint,
          )
        ])
    }
  };

  static fromSvgSegments = (segments: any[], linejoin: StrokeLinejoins) => {
    let newPath = new Path([], false, linejoin);

    let firstPoint: Point = new Point(segments[0][1], segments[0][2]);
    let lastPoint: Point = null;

    _.forEach(segments, (segment: any[]) => {
      switch (segment[0]) {
        case "M":
        case "L":
        case "H":
        case "V":
          let currentPoint = new Point(segment[1], segment[2]);

          if (lastPoint) {
            if (segment[0] === "V") {
              currentPoint = new Point(lastPoint.x, segment[1])
            }

            if (segment[0] === "H") {
              currentPoint = new Point(segment[1], lastPoint.y)
            }

            newPath = newPath.append(new Line(lastPoint, currentPoint));
          }

          lastPoint = currentPoint;
          break;
        case "C":
          const startControlPoint = new Point(segment[1], segment[2]);
          const endControlPoint = new Point(segment[3], segment[4]);
          const endPoint = new Point(segment[5], segment[6]);

          if (lastPoint) {
            newPath = newPath.append(new CubicBezier(lastPoint, startControlPoint, endControlPoint, endPoint));
          }

          lastPoint = endPoint;
          break;
        case "Q":
          const controlPoint = new Point(segment[1], segment[2]);
          const endPointForQuaq = new Point(segment[3], segment[4]);

          if (lastPoint) {
            newPath = newPath.append(new QuadraticBezier(lastPoint, controlPoint, endPointForQuaq));
          }

          lastPoint = endPointForQuaq;
          break;
        case "Z":
          if (!firstPoint.eql(lastPoint)) {
            newPath = newPath.append(new Line(lastPoint, firstPoint));
          }
          newPath = newPath.setClosed();
          break;
      }
    });

    return newPath;
  };

  setClosed() {
    return new Path(
      Path.connectPatchWhenNeed(this.segs, true, this.linejoin),
      true,
      this.linejoin
    );
  }

  append(seg: Seg) {
    return new Path(this.segs.concat(seg), this.closed, this.linejoin);
  }

  print() {
    return _.map(this.segs, (seg) => seg.print()).join(" | ");
  }

  connect(path: Path, isClosed: boolean) {
    return new Path(
      Path.connectPatchWhenNeed(this.segs.concat(path.segs), isClosed, this.linejoin),
      isClosed,
      this.linejoin,
    )
  }

  reversePoints() {
    return new Path(_.reverse(this.segs.map((seg) => seg.reversePoints())), false, this.linejoin);
  }


  getFirstPoint(): Point {
    return this.getFirstSeg().getFirstPoint()
  }

  getLastPoint(): Point {
    return this.getLastSeg().getLastPoint()
  }

  getFirstSeg(): Seg {
    return _.first(this.segs);
  }

  getLastSeg(): Seg {
    return _.last(this.segs);
  }

  outline(radius: number, linecap: StrokeLinecaps): string {
    const forwardPath = this.offset(radius);
    const backwardPath = this.offset(-radius).reversePoints();

    const connectPath = Path.getLinecapPath(
      forwardPath.getLastPoint(),
      backwardPath.getFirstPoint(),
      linecap || StrokeLinecaps.butt,
    );

    const endedPath = Path.getLinecapPath(
      backwardPath.getLastPoint(),
      forwardPath.getFirstPoint(),
      linecap || StrokeLinecaps.butt,
    );


    if (this.closed) {
      return [
        forwardPath
          .setClosed()
          .toSvg(),
        backwardPath
          .setClosed()
          .toSvg(),
      ].join("");
    }

    return forwardPath
      .connect(connectPath, false)
      .connect(backwardPath, false)
      .connect(endedPath, false)
      .setClosed()
      .toSvg();
  }

  offset(radius: number) {
    return _.reduce(
      this.segs,
      (finalPath, seg) => finalPath.connect(seg.offset(radius), false),
      new Path([], false, this.linejoin),
    );
  }

  toSvg(): string {
    return _.map(this.segs, (seg, idx, segs) => seg.toSvg(idx === 0)).join("") + (this.closed ? "Z" : "");
  }
}

/*
 * File: asg0.js
 * Name: Peter Xu
 * Date: 2026-04-02
 *
 * Description:
 * This file implements the main logic for Assignment 0.
 * It draws vectors on a canvas and supports vector operations
 * including add, subtract, multiply, divide, magnitude,
 * normalize, angle between, and area.
 */


function main() {
  var canvas = document.getElementById('example');
  if (!canvas) {
    console.log('No canvas');
    return;
  }

  var ctx = canvas.getContext('2d');
  clearCanvas(ctx, canvas);
}

function clearCanvas(ctx, canvas) {
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawVector(v, color) {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');

  var centerX = canvas.width / 2;
  var centerY = canvas.height / 2;
  var scale = 20;

  ctx.beginPath();
  ctx.moveTo(centerX, centerY);
  ctx.lineTo(centerX + v.elements[0] * scale, centerY - v.elements[1] * scale);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function getVectorInputs() {
  var x1 = parseFloat(document.getElementById('v1x').value);
  var y1 = parseFloat(document.getElementById('v1y').value);
  var x2 = parseFloat(document.getElementById('v2x').value);
  var y2 = parseFloat(document.getElementById('v2y').value);

  if (isNaN(x1) || isNaN(y1) || isNaN(x2) || isNaN(y2)) {
    return null;
  }

  var v1 = new Vector3([x1, y1, 0]);
  var v2 = new Vector3([x2, y2, 0]);

  return { v1: v1, v2: v2 };
}

function copyVector(v) {
  return new Vector3([v.elements[0], v.elements[1], v.elements[2]]);
}

function handleDrawEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  clearCanvas(ctx, canvas);

  var vectors = getVectorInputs();
  if (!vectors) {
    return;
  }

  drawVector(vectors.v1, 'red');
  drawVector(vectors.v2, 'blue');
}


function angleBetween(v1, v2) {
  var dot = Vector3.dot(v1, v2);
  var mag1 = v1.magnitude();
  var mag2 = v2.magnitude();

  if (mag1 === 0 || mag2 === 0) {
    return 0;
  }

  var cosAlpha = dot / (mag1 * mag2);

  if (cosAlpha > 1) {
    cosAlpha = 1;
  } else if (cosAlpha < -1) {
    cosAlpha = -1;
  }

  var angleRadians = Math.acos(cosAlpha);
  var angleDegrees = angleRadians * 180 / Math.PI;
  return angleDegrees;
}

function areaTriangle(v1, v2) {
  var cross = Vector3.cross(v1, v2);
  var area = cross.magnitude() / 2;
  return area;
}





function handleDrawOperationEvent() {
  var canvas = document.getElementById('example');
  var ctx = canvas.getContext('2d');
  clearCanvas(ctx, canvas);

  var vectors = getVectorInputs();
  if (!vectors) {
    return;
  }

  var v1 = vectors.v1;
  var v2 = vectors.v2;

  drawVector(v1, 'red');
  drawVector(v2, 'blue');

  var operation = document.getElementById('operation').value;
  var scalar = parseFloat(document.getElementById('scalar').value);

  if (operation === 'add') {
    var v3 = copyVector(v1);
    v3.add(v2);
    drawVector(v3, 'green');
  } else if (operation === 'sub') {
    var v3 = copyVector(v1);
    v3.sub(v2);
    drawVector(v3, 'green');
  } else if (operation === 'mul') {
    if (isNaN(scalar)) {
      return;
    }

    var v3 = copyVector(v1);
    var v4 = copyVector(v2);

    v3.mul(scalar);
    v4.mul(scalar);

    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (operation === 'div') {
    if (isNaN(scalar) || scalar === 0) {
      return;
    }

    var v3 = copyVector(v1);
    var v4 = copyVector(v2);

    v3.div(scalar);
    v4.div(scalar);

    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (operation === 'magnitude') {
    console.log('Magnitude v1: ' + v1.magnitude());
    console.log('Magnitude v2: ' + v2.magnitude());
  } else if (operation === 'normalize') {
    var v3 = copyVector(v1);
    var v4 = copyVector(v2);

    v3.normalize();
    v4.normalize();

    drawVector(v3, 'green');
    drawVector(v4, 'green');
  } else if (operation === 'angle') {
    console.log('Angle: ' + angleBetween(v1, v2));
  } else if (operation === 'area') {
    console.log('Area of the triangle: ' + areaTriangle(v1, v2));
  }
}
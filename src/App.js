import './App.css';
import {useLayoutEffect, useState} from "react";
import rough from "roughjs/bundled/rough.esm";


const generator = rough.generator();

const distance = (a, b) => Math.sqrt(Math.pow(a.x-b.x, 2) + Math.pow(a.y-b.y, 2));

function createElement(id, x1, y1, x2, y2, type){
  let newElement = null;
  switch (type){
    case "line":
      newElement = generator.line(x1,y1,x2,y2, { roughness: 0 });
      break;
    case "rectangle":
      newElement = generator.rectangle(
          x1, y1, x2-x1, y2-y1,
          { roughness: 0 });
      break;
    case "circle":
      newElement = generator.circle(x1, y1,
          (Math.sqrt(Math.pow((x2-x1), 2) + Math.pow((y2-y1), 2))*2),
              { roughness: 0 });
      break;
    case "triangle":
      const dist = Math.sqrt(Math.pow(x2-x1, 2)+Math.pow(y2-y1, 2));
      const scale = 40*(dist/100);
      newElement = generator.polygon(
          [[x1-(scale), y1],
            [x1+(scale), y1],
            [x2,y2]
          ]
      );
      break;
    default:
      break;
  }
  return { id, x1, y1, x2, y2, type, newElement };
}

function nearPoint(x, y, x1, y1, name) {
  return Math.abs(x-x1)<5 && Math.abs(y-y1)<5 ? name : null;
}

const pointWithinElement = (x, y, element) => {
  const {type, x1, y1, x2, y2} = element;

  if (type === "rectangle") {
    const topLeft     = nearPoint(x, y, x1, y1, "tl");
    const topRight    = nearPoint(x, y, x2, y1, "tr");
    const bottomLeft  = nearPoint(x, y, x1, y2, "bl");
    const bottomRight = nearPoint(x, y, x2, y2, "br");
    const inside      = x >= x1 && x <= x2 && y >= y1 && y <= y2 ? "inside" : null;

    return topLeft || topRight || bottomLeft || bottomRight || inside;

  } else if (type === "line") {
    const a = {x: x1, y: y1};
    const b = {x: x2, y: y2};
    const c = {x, y};

    const offset  = distance(a, b) - (distance(a, c) + distance(b, c))
    const start   = nearPoint(x,y, x1, y1, "start");
    const end     = nearPoint(x, y, x2, y2, "end");
    const inside  = (Math.abs(offset) < 1 ? "inside" : null);

    return start || end || inside;

  } else if (type === "circle") {
    const center         = {x: x1, y: y1};
    const shapeCords     = {x: x2, y: y2};
    const selectionPoint = {x, y};
    const radiusToSelection = distance(center, selectionPoint);
    const radiusToBorder    = distance(center, shapeCords);

    const inside = (radiusToSelection < radiusToBorder ? "inside" : null);
    const onEdge = (Math.abs(radiusToSelection - radiusToBorder) < 5 ? "edge" : null);

    return inside ||onEdge;

  } else if (type === "triangle") {
    const dist = Math.sqrt(Math.pow(x2-x1, 2)+Math.pow(y2-y1, 2));
    const scale = 40*(dist/100);

    const pointA = {x: (x1-scale), y: y1};
    const pointB = {x: (x1+scale), y: y1};
    const pointC = {x: x2, y: y2};

    const distAC = distance(pointA, pointC);
    const distBC = distance(pointB, pointC);

    const nearA = nearPoint(x, y, pointA.x, pointA.y, "A");
    const nearB = nearPoint(x, y, pointB.x, pointB.y, "B");
    const nearC = nearPoint(x, y, pointC.x, pointC.y, "C");

    if (distAC === distBC){
      const distAB = {x: pointB.x-pointA.x, y: pointB.y-pointA.y};
      const distAM = {x: distAB.x/2, y: distAB.y/2};
      const pointM = {x: pointA.x + distAM.x, y: pointA.y + distAM.y};

      let inside;
      if (pointC.y < pointA.y){
        inside = (x >= pointA.x && x <= pointB.x && y <= pointM.y && y >= pointC.y) ? "inside" : null;
      } else{
        inside = (x >= pointA.x && x <= pointB.x && y >= pointM.y && y <= pointC.y) ? "inside" : null;
      }
      return inside || nearA || nearB || nearC;

    } else if (distAC > distBC) {

      let inside;
      if (pointC.y > pointA.y){
        inside = (x > pointA.x && x < pointC.x && y < pointC.y && y > pointA.y) ? "inside" : null;
      } else{
        inside = (x > pointA.x && x < pointC.x && y > pointC.y && y < pointA.y) ? "inside" : null;
      }
      return inside || nearA || nearB || nearC;

    } else {

      let inside;
      if (pointC.y > pointA.y){
        inside = (x < pointB.x && x > pointC.x && y < pointC.y && y > pointB.y) ? "inside" : null;
      } else{
        inside = (x < pointB.x && x > pointC.x && y > pointC.y && y < pointB.y) ? "inside" : null;
      }
      return inside || nearA || nearB || nearC;
    }
  }
};

function getElementAtPosition(x, y, elements) {
  return elements.map(element => ({...element, position: pointWithinElement(x, y, element)}))
      .find(element => element.position != null);
}

const adjustElementCoordinates = element => {
  const { type, x1, y1, x2, y2 } = element;
  if (type === "rectangle"){
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return {x1: minX, y1: minY, x2: maxX, y2: maxY};
  } else if (type === "line"){
    if (x1 < x2 || (x1 === x2 && y1 < y2)){
      return { x1, y1, x2, y2};
    } else {
      return {x1: x2, y1: y2, x2: x1, y2: y1}
    }
  } else if (type === "circle") {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    return {x1: minX, y1: minY, x2: maxX, y2: maxY};
  } else if (type === "triangle"){
    return {x1, y1, x2, y2};
  }
}

const cursorForPosition = position =>  {
  switch (position){
    case "tl":
    case "br":
    case "start":
    case "end":
    case "edge":
      return "nwse-resize";
    case "tr":
    case "bl":
    case "A":
    case "B":
    case "C":
      return "nesw-resize";
    default:
      return "move";
  }
}

const resizedCoordinates = (clientX, clientY, position, coordinates) => {
  const {x1, y1, x2, y2} = coordinates;
  const dist = Math.sqrt(Math.pow(x2-x1, 2)+Math.pow(y2-y1, 2));
  const scale = 40*(dist/100);
  let offset;

  switch (position){
    case "tl":
    case "start":
      return {x1: clientX, y1: clientY, x2, y2};
    case "tr":
      return  {x1, y1: clientY, x2: clientX, y2};
    case "bl":
      return  {x1: clientX, y1, x2, y2: clientY};
    case "br":
    case "end":
      return  {x1, y1, x2: clientX, y2: clientY};
    case "edge":
      return {x1, y1, x2: clientX, y2: clientY}
    case "A":
      const pointA = {x: (x1-scale), y: y1};
      offset = {x: clientX-pointA.x, y: clientY-pointA.y};
      return {x1, y1, x2: (x2+offset.x), y2: (y2+offset.y)};
    case "B":
      const pointB = {x: (x1+scale), y: y1};
      offset = {x: clientX-pointB.x, y: clientY-pointB.y};
      return {x1, y1, x2: (x2+offset.x), y2: (y2+offset.y)};
    case "C":
      const pointC = {x: x2, y: y2};
      offset = {x: clientX-pointC.x, y: clientY-pointC.y};
      return {x1, y1, x2: (x2+offset.x), y2: (y2+offset.y)};
    default:
      return null;
  }
}

function App() {
  const [elements, setElements] = useState([])
  const [action, setAction] = useState("none");
  const [tool, setTool] = useState("line");
  const [selectedEl, setSelectedEl] = useState(null);

  useLayoutEffect(() => {
    const canvas = document.getElementById("canvas");
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height)

    const roughCanvas = rough.canvas(canvas);

    elements.forEach(({ newElement }) => roughCanvas.draw(newElement));

  });

  const actionMouseDown = (event) => {
    const {clientX, clientY} = event;


    if (tool === "selection"){
      const element = getElementAtPosition(clientX, clientY, elements);
      if (element){
        const offsetX = clientX - element.x1,
            offsetY = clientY - element.y1;
        setSelectedEl({...element, offsetX, offsetY});
        if (element.position === "inside"){
          setAction("moving");
        } else {
          setAction("resize");
        }
      }
    } else {
      const id = elements.length;
      const element = createElement(id, clientX, clientY, clientX, clientY, tool);
      setElements(prevState => [...prevState, element]);
      setSelectedEl(element);
      setAction("drawing");

    }
  };

  const actionMouseMove = (event) => {
    const {clientX, clientY} = event;

    if (tool === "selection") {
      const element = getElementAtPosition(clientX, clientY, elements);
      event.target.style.cursor = element
          ? cursorForPosition(element.position)
          : "default";
    }

    if (action === "drawing") {
      const index = elements.length - 1;
      const {x1, y1} = elements[index];
      updateElement(index, x1, y1, clientX, clientY, tool);
    } else if (action === "moving"){
      const { id, x1, y1, x2, y2, type, offsetX, offsetY} = selectedEl;
      const width = x2-x1,
          height  = y2-y1;
      const newX  = clientX - offsetX,
          newY    = clientY - offsetY
      updateElement(id, newX, newY, newX+width, newY+height, type);
    } else if (action === "resize"){
      const { id, type, position, ...coordinates} = selectedEl;
      const {x1, y1, x2, y2} = resizedCoordinates(clientX, clientY, position, coordinates);
      updateElement(id, x1, y1, x2, y2, type);
    }
  };

  const actionMouseUp = () => {

    if (action === "resize"){
      const index = selectedEl.id;
      const { id, type } = elements[index];
      const { x1, y1, x2, y2 } = adjustElementCoordinates(elements[index]);
      updateElement(id, x1, y1, x2, y2, type);
    }

    setAction("none");
    setSelectedEl(null);
  };

  function updateElement(id, x1, y1, clientX, clientY,type) {
    const updatedElement = createElement(id, x1, y1, clientX, clientY, type);

    const elementsCopy = [...elements];
    elementsCopy[id] = updatedElement;
    setElements(elementsCopy);
  }


  return (
      <>
        <div style={{ position: "fixed" }}>
          <input
            type="radio"
            id="selection"
            checked={tool === "selection"}
            onChange={() => setTool("selection")}
          />
          <label htmlFor="selection">Selection</label>
          <input
            type="radio"
            id="line"
            checked={tool === "line"}
            onChange={() => setTool("line")}
          />
          <label htmlFor="line">Line</label>
          <input
            type="radio"
            id="rectangle"
            checked={tool === "rectangle"}
            onChange={() => setTool("rectangle")}
          />
          <label htmlFor="rectangle">Rectangle</label>
          <input
            type="radio"
            id="circle"
            checked={tool === "circle"}
            onChange={() => setTool("circle")}
          />
          <label htmlFor="Circle">Circle</label>
          <input
            type="radio"
            id="triagle"
            checked={tool === "triangle"}
            onChange={() => setTool("triangle")}
          />
          <label htmlFor="triagle">Triangle</label>
        </div>
        <canvas
            id={"canvas"}
            width={window.innerWidth}
            height={window.innerHeight}
            onMouseDown={actionMouseDown}
            onMouseMove={actionMouseMove}
            onMouseUp={actionMouseUp}
            onPointerDown={actionMouseDown}
            onPointerMove={actionMouseMove}
            onPointerOut={actionMouseUp}
        >
          Canvas</canvas>
      </>
  );
}

export default App;

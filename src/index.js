import { Engine, Render, World, Bodies, use, Mouse, Events, Body, Vector } from 'matter-js';
import MatterAttractors from 'matter-attractors';

import './index.scss';

const Keys = {
  LEFT: 37,
  UP: 38,
  RIGHT: 39,
  DOWN: 40
};

class Main {
  constructor() {
    use(MatterAttractors);
    this._pressed = [];
    this._shipProperties = {
      hasPlanetLanded: false,
      resistance: 800,
      forwardSpeed: -0.9e-4,
      backwardSpeed: 1e-5,
      speedThrottle: 0,
      shapePoints: [[-5, 10], [-5, -10], [10, 0]],
      enginePoints: [[-5, -2], [-10, -2], [-10, 2], [-5, 2]],
      landedPoint: [[-5, -10], [-5, 0], [-5, 10]]
    }
    this.init();
  }

  init() {
    const engine = Engine.create();

    engine.world.gravity.scale = 0;

    const render = Render.create({
      element: document.body,
      engine: engine,

      options: {
        width: Math.min(window.innerWidth, 1024),
        height: Math.min(window.innerHeight, 1024),
        showAngleIndicator: true,
        wireframes: true,
        showVelocity: true,
        showCollisions: true,
        hasBounds: true
      }
    });

    const planetData = [{
      id: "planet1",
      posX: 400,
      posY: 500,
      radius: 120,
      gravityForce: 0.5e-7,
      attractionRadius: 2
    }, {
      id: "planet2",
      posX: 1300,
      posY: 200,
      radius: 320,
      gravityForce: 0.2e-7,
      attractionRadius: 2.5
    }, {
      id: "planet3",
      posX: 100,
      posY: 620,
      radius: 120,
      gravityForce: 0.3e-7,
      attractionRadius: 4
    }, {
      id: "planet4",
      posX: -400,
      posY: 230,
      radius: 120,
      gravityForce: 0.5e-7,
      attractionRadius: 2
    }, {
      id: "planet5",
      posX: -800,
      posY: -350,
      radius: 100,
      gravityForce: 0.5e-7,
      attractionRadius: 2
    }, {
      id: "planet6",
      posX: 900,
      posY: 650,
      radius: 60,
      gravityForce: 0.8e-7,
      attractionRadius: 5
    }];

    for (let i = 0; i < planetData.length; i += 1) {
      const { posX, posY, radius, gravityForce, attractionRadius } = planetData[i];
      const body = Bodies.circle(posX, posY, radius, {
        plugin: {
          attractors: [
            (bodyA, bodyB) => {
              const bodyARadius = bodyA.circleRadius;
              const vec = Vector.create(0, 0);
              Vector.add(vec, bodyA.position, vec);
              Vector.sub(vec, bodyB.position, vec);
              const distance = Vector.magnitude(vec);
              if (distance <= radius * attractionRadius) {
                bodyA.render.fillStyle = "0xffcc00"
                const gravityAttenuation =
                  Math.max(0,
                    Math.min(1,
                      (distance - (radius * attractionRadius)) / (radius - (radius * attractionRadius))
                    )
                  );
                // 1e-6 -> 1e-14
                const force = {
                  x: (bodyA.position.x - bodyB.position.x) * gravityForce * gravityAttenuation,
                  y: (bodyA.position.y - bodyB.position.y) * gravityForce * gravityAttenuation,
                };
                Body.applyForce(bodyA, bodyA.position, force);
                Body.applyForce(bodyB, bodyB.position, force);
              }
            }
          ]
        },
        isStatic: true,
        render: {
          fillStyle: '#ffffff'
        }
      });
      planetData[i].body = body;
      planetData[i].startPosition = Vector.clone(body.position);
      World.add(engine.world, body);
    }

    const ship = Bodies.polygon(400, 200, 3, 10);
    this.startPosition = Vector.clone(ship.position);
    const ground = Bodies.rectangle(400, 610, 810, 60, { isStatic: true });

    World.add(engine.world, [ship]);

    Engine.run(engine);

    Render.run(render);



    const isKeyDown = (keyCode) => {
      return this._pressed[keyCode];
    };

    window.addEventListener('keyup', (event) => {
      delete this._pressed[event.keyCode];
    }, false);

    window.addEventListener('keydown', (event) => {
      var keyFound = false;
      for (var keyName in Keys) {
        if (event.keyCode == Keys[keyName]) {
          keyFound = true;
          break;
        }
      }
      if (keyFound) {
        this._pressed[event.keyCode] = true;
      }
    }, false);

    // add mouse control
    // var mouse = Mouse.create(render.canvas);


    const initialEngineBoundsMaxX = render.bounds.max.x
    const initialEngineBoundsMaxY = render.bounds.max.y
    const centerX = - render.options.width / 2;
    const centerY = - render.options.height / 2;

    const centerShipOnScreen = () => {
      render.bounds.min.x = centerX + ship.bounds.min.x
      render.bounds.max.x = centerX + ship.bounds.min.x + initialEngineBoundsMaxX
      render.bounds.min.y = centerY + ship.bounds.min.y
      render.bounds.max.y = centerY + ship.bounds.min.y + initialEngineBoundsMaxY
    };
    centerShipOnScreen();

    Events.on(engine, 'afterUpdate', () => {
      if (this._pressed.length === 0) {
        return;
      }

      const shipProps = this._shipProperties;
      var shipPosition = ship.position;
      var shipAngle = ship.angle;
      var shipAngularVelocity = ship.angularVelocity;
      var shipAngleDirty = true;
      var isEngineActive = false;
      var angleIncrement = Math.PI / 90;
      var magnitude = 1;
      var acceleration;

      if (isKeyDown(Keys.LEFT) && !shipProps.hasPlanetLanded) {
        shipAngle -= angleIncrement;
        shipAngleDirty = false;
      } else if (isKeyDown(Keys.RIGHT) && !shipProps.hasPlanetLanded) {
        shipAngle += angleIncrement;
        shipAngleDirty = false;
      }
      if (isKeyDown(Keys.UP)) {
        magnitude = shipProps.forwardSpeed;
        shipAngularVelocity -= 4;
        isEngineActive = true;
        acceleration = 0.4;
        shipProps.isEngineActive = true;
        shipAngleDirty = true;
      } else if (isKeyDown(Keys.DOWN) && !shipProps.hasPlanetLanded) {
        magnitude = shipProps.backwardSpeed;
        shipAngularVelocity -= 10;
        isEngineActive = true;
        acceleration = 1;
        shipProps.isEngineActive = true;
        shipAngleDirty = true;
      }

      let force = Vector.create(0, 0);
      Body.setAngle(ship, shipAngle);
      if (shipAngleDirty && isEngineActive) {
        const forceX = Math.cos(shipAngle) * magnitude;
        const forceY = Math.sin(shipAngle) * magnitude;
        force = Vector.create(forceX, forceY);
        force = Vector.mult(force, acceleration);
        Body.applyForce(ship, shipPosition, force);
        shipAngularVelocity = Math.max(0, Math.min(0.1, shipAngularVelocity));
        Body.setAngularVelocity(ship, shipAngularVelocity);
      } else {
        acceleration = 0;
      }

      centerShipOnScreen();

      // let vecTmp;
      // const vecTranslate = Vector.sub(this.startPosition, ship.position);
      // for (let i = 0; i < planetData.length; i++) {
      // Body.setPosition(planetData[i].body, Vector.add(planetData[i].startPosition, vecTranslate));
      // }

      document.querySelector('#ship-ang-velocity').innerHTML = `ang. velocity: ${shipAngularVelocity.toFixed(2)}`;
      document.querySelector('#ship-force-field').innerHTML = `x: ${force.x.toFixed(2)}, y: ${force.y.toFixed(2)}, acc.: ${acceleration.toFixed(2)}`;
      document.querySelector('#ship-pos').innerHTML = `posX: ${shipPosition.x.toFixed(2)}, posY: ${shipPosition.y.toFixed(2)}`;

      //   if (!mouse.position.x) {
      //     return;
      //   }

      //   // smoothly move the attractor body towards the mouse
      //   Body.translate(attractiveBody, {
      //     x: (mouse.position.x - attractiveBody.position.x) * 0.25,
      //     y: (mouse.position.y - attractiveBody.position.y) * 0.25
      //   });
    });
  }

}
(() => new Main())();
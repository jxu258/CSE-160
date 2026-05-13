class Camera {
    constructor(aspectRatio, near, far){
      this.fov = 60;
      this.eye = new Vector3([-11, 1.6, 11]);
      this.center = new Vector3([-8, 1.6, 8]);
      this.up = new Vector3([0, 1, 0]);
      this.speed = 0.2;
      this.panSpeed = 2.5;

      this.viewMatrix = new Matrix4();
      this.updateView();

      this.projectionMatrix = new Matrix4();
      this.projectionMatrix.setPerspective(this.fov, aspectRatio, near, far);

    }

    getForward(){
      let f = new Vector3();
      f.set(this.center);
      f.sub(this.eye);
      return f.normalize();
    }

    moveForward(speed){
      let f = this.getForward();
      f.elements[1] = 0;
      f.normalize();
      f.mul(speed || this.speed);
      this.eye.add(f);
      this.center.add(f);
      this.updateView();
    }

    moveBackwards(speed){
      let b = this.getForward();
      b.elements[1] = 0;
      b.normalize();
      b.mul(-(speed || this.speed));
      this.eye.add(b);
      this.center.add(b);
      this.updateView();
    }

    moveLeft(speed){
      let f = this.getForward();
      f.elements[1] = 0;
      f.normalize();
      let s = Vector3.cross(this.up, f).normalize();
      s.mul(speed || this.speed);
      this.eye.add(s);
      this.center.add(s);
      this.updateView();
    }

    moveRight(speed){
      let f = this.getForward();
      f.elements[1] = 0;
      f.normalize();
      let s = Vector3.cross(f, this.up).normalize();
      s.mul(speed || this.speed);
      this.eye.add(s);
      this.center.add(s);
      this.updateView();
    }

    panLeft(angle){
      this.pan(angle || this.panSpeed);
    }

    panRight(angle){
      this.pan(-(angle || this.panSpeed));
    }

    pan(angle){
      let f = this.getForward();
      let rotationMatrix = new Matrix4();
      rotationMatrix.setRotate(angle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);
      let fPrime = rotationMatrix.multiplyVector3(f);
      this.center.set(this.eye);
      this.center.add(fPrime);
      this.updateView();
    }

    lookBy(dx, dy){
      this.panRight(dx * 0.12);
    }

    updateView(){
      this.viewMatrix.setLookAt(this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
                        this.center.elements[0], this.center.elements[1], this.center.elements[2],
                        this.up.elements[0], this.up.elements[1], this.up.elements[2]);
    }

}

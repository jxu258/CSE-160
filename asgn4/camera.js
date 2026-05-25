class Camera {
    constructor() {
        this.near = 0.1;
        this.far = 1000;
        this.fov = 55;

        this.eye = new Vector3([0, 3.0, 10.0]);
        this.center = new Vector3([0, 1.0, 0]);
        this.up = new Vector3([0, 1, 0]);

        this.projMatrix = new Matrix4();
        this.projMatrix.setPerspective(this.fov, canvas.width / canvas.height, this.near, this.far);

        this.viewMatrix = new Matrix4();
        this.updateView();
    }

    moveForward(scale) {
        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);
        forward.normalize();
        forward.mul(scale);

        this.eye.add(forward);
        this.center.add(forward);
        this.updateView();
    }

    moveSideways(scale) {
        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);
        forward.normalize();

        let right = Vector3.cross(forward, this.up);
        right.normalize();
        right.mul(scale);

        this.eye.add(right);
        this.center.add(right);
        this.updateView();
    }

    pan(angle) {
        let rotMatrix = new Matrix4();
        rotMatrix.setRotate(angle, this.up.elements[0], this.up.elements[1], this.up.elements[2]);

        let forward = new Vector3(this.center.elements);
        forward.sub(this.eye);
        let rotatedForward = rotMatrix.multiplyVector3(forward);

        this.center = new Vector3(this.eye.elements);
        this.center.add(rotatedForward);
        this.updateView();
    }

    zoom(scale) {
        this.projMatrix.setPerspective(this.fov * scale, canvas.width / canvas.height, this.near, this.far);
    }

    lookAt(eyeX, eyeY, eyeZ, centerX, centerY, centerZ) {
        this.eye = new Vector3([eyeX, eyeY, eyeZ]);
        this.center = new Vector3([centerX, centerY, centerZ]);
        this.updateView();
    }

    updateView() {
        this.viewMatrix.setLookAt(
            this.eye.elements[0], this.eye.elements[1], this.eye.elements[2],
            this.center.elements[0], this.center.elements[1], this.center.elements[2],
            this.up.elements[0], this.up.elements[1], this.up.elements[2]
        );
    }
}

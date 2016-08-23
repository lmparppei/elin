var size = 600;
var radius = size / 2;

var container, stats;

var camera, controls, scene, renderer;

var mesh, texture;

var clock = new THREE.Clock();
var theta; 

var helper;

var raycaster = new THREE.Raycaster();
var mouse = new THREE.Vector2();

mouse.down = false;
mouse.right = false;

var animVertex = new THREE.Vector3();

var audio = new AudioContext();
var tones = [20, 25, 28, 31, 35, 39, 8, 7, 3, 10];

init();			
var synth = new Synth(mesh);
animate();

function Synth(mesh) {

	this.oscillators = [];
	this.gains = [];
	this.oscillators = [];

	for (i=0; i < mesh.geometry.vertices.length; i++) {
		var vert = mesh.geometry.vertices[i];
		var osc = audio.createOscillator();
		var gain = audio.createGain();
		
		osc.filter = audio.createBiquadFilter();
		osc.filter.type = 'bandpass';
		osc.pan = audio.createStereoPanner();
		
		//osc.filter.frequency = 1000;

		osc.filter.Q = 1000;

		gain.connect(audio.destination);
		osc.connect(osc.filter);
		osc.filter.connect(osc.pan);
		osc.pan.connect(gain);
		osc.gain = gain;

		gain.gain.value = 0;

		var t = Math.floor(Math.random() * 4);
		if (t == 1) { osc.type = 'sawtooth'; }
		if (t == 2 || t == 0) { osc.type = 'triangle'; }
		if (t == 3) { osc.type = 'square'; }
							
		osc.baseFrequency = 16.35 * Math.pow( Math.pow(2, 1/12), Math.floor(Math.random() * 90 - 30) );
		
		osc.frequency.value = 0;
		osc.start(audio.currentTime);
		
		this.oscillators.push(osc);
		this.gains.push(gain);
	}

	this.playOsc = function(num, freq, detune, gain, filter) {
		freq = Math.abs(freq);
		var tone = Math.floor(freq - 350) / 10;

		this.oscillators[num].frequency.value = this.oscillators[num].baseFrequency + 16.35 * Math.pow( Math.pow(2, 1/12), tone );
		
		gain = gain * .05;
		if (gain < .25) { this.gains[num].gain.value = gain; } else { this.gains[num].gain.value = .25; }
	}
}

function init() {

	container = document.getElementById( 'container' );

	camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 1, 20000 );

	scene = new THREE.Scene();

	controls = new THREE.OrbitControls(camera);
	controls.target.set( 0.0, 100.0, 0.0 );
	controls.userPanSpeed = 100;
	controls.target.y = 0;

	camera.position.z = 1000;

	var geometry = new THREE.BoxGeometry(size, size, size, 6, 6, 6);
	
	for (var i in geometry.vertices) {
        var vertex = geometry.vertices[i];
        vertex.normalize().multiplyScalar(350);
        
        vertex.x += Math.random() * 10 - 5;
        vertex.y += Math.random() * 10 - 5;
        vertex.z += Math.random() * 10 - 5;
        
        vertex.mod = Math.random();
    }
    geometry.computeFaceNormals();
    geometry.computeVertexNormals();

	mesh = new THREE.Mesh(
		geometry, 
		new THREE.MeshPhongMaterial({ 
			color: 0xdddddd, 
			shading: THREE.FlatShading,
			shininess: 1
		})
	);
	scene.add(mesh);

	scene.fog = new THREE.Fog( 0xeeeeee, 500, 10000 );

	var light = new THREE.PointLight(0xffffff, 1.5, 1500);
	light.position.set(-500,-600,-300);
	scene.add(light);
	
	var light = new THREE.DirectionalLight(0xffffff, .8);
	light.position.set(500,600,0);
	scene.add(light);

	var ambient = new THREE.AmbientLight(0x222222, 2);
	scene.add(ambient);

	camera.lookAt(mesh.position);

	var geometry = new THREE.CylinderGeometry( 0, 20, 100, 3 );
	geometry.translate( 0, 50, 0 );
	geometry.rotateX( Math.PI / 2 );
	helper = new THREE.Mesh( geometry, new THREE.MeshBasicMaterial({ color: 0x0060a0 }) );
	scene.add( helper );

	renderer = new THREE.WebGLRenderer({ antialias: true });
	renderer.setClearColor( 0xeeeeee );
	renderer.setPixelRatio( window.devicePixelRatio );
	renderer.setSize( window.innerWidth, window.innerHeight );

	container.innerHTML = "";

	container.appendChild( renderer.domElement );
	container.addEventListener( 'mousemove', onMouseMove, false );
	container.addEventListener('mousedown', function (e) {
		if (e.button == 2) {
			mouse.right = true;
		}
		mouse.down = true;
	});
	container.addEventListener('mouseup', function () {
		mouse.down = false;
		mouse.right = false;
		controls.enabled = true;
	});

	/*
	stats = new Stats();
	container.appendChild( stats.dom );
	*/

	window.addEventListener( 'resize', onWindowResize, false );

}

function onWindowResize() {

	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();

	renderer.setSize( window.innerWidth, window.innerHeight );

}

function leftOrRight(vect) {
	var indicatorTarget = vect;
	var crossprod = new THREE.Vector3( 0, 0, 0 );
	var direction = 0;

	crossprod.crossVectors(controls.target, indicatorTarget);

	direction = crossprod.dot(camera.up);

	if (direction > 0) return -1;
	else if (direction < 0) return 1;
	else return 0;
}

function animate() {

	requestAnimationFrame( animate );

	//mesh.rotation.y += .005;
	theta = clock.getElapsedTime();

	render();
	if (stats) { stats.update(); }


	for (v in mesh.geometry.vertices) {
		var vertex = mesh.geometry.vertices[v];
		var dist = vertex.distanceTo(scene.position);

		var pan = vertex.x / 1000;
		var modAmount = dist / size * 1.333;

		animVertex.copy(vertex);
		animVertex.setLength((Math.sin(theta + vertex.mod * 30) * .1) * (dist * 0.005));

		vertex.add(animVertex);

		synth.oscillators[v].gain.gain.value += Math.sin(theta + vertex.mod * .2) * .0005;
		synth.oscillators[v].pan.pan.value = pan;
		//synth.oscillators[v].pan.pan.value = leftOrRight(vertex);
		
		// Modulation
		if (synth.oscillators[v].frequency.value > 10) {
			synth.oscillators[v].frequency.value += Math.sin((theta + vertex.mod + modAmount * 10)) * (.1 * modAmount); 
		}
	}
	mesh.geometry.verticesNeedUpdate = true;
}

function render() {

	controls.update( clock.getDelta() );
	renderer.render( scene, camera );

}

function onMouseMove( event ) {

	var matrix = new THREE.Matrix4();
	matrix.extractRotation( mesh.matrix );

	var direction = new THREE.Vector3( 0, 0, 1 );
	direction.applyProjection( matrix );

	mouse.x = ( event.clientX / renderer.domElement.clientWidth ) * 2 - 1;
	mouse.y = - ( event.clientY / renderer.domElement.clientHeight ) * 2 + 1;
	raycaster.setFromCamera( mouse, camera );

	var intersects = raycaster.intersectObject( mesh );

	if ( intersects.length > 0 ) {
		helper.position.set( 0, 0, 0 );
		helper.lookAt( intersects[ 0 ].face.normal );

		helper.position.copy( intersects[ 0 ].point );

		var ver = intersects[ 0 ].face;

		var dir = new THREE.Vector3();
		dir.copy(intersects[0].point);

		if (mouse.down) {
			if (mouse.right) { var mod = -1; } else { var mod = 1; }
			dir.setLength( mod * 3 );

			controls.enabled = false;
			
			var vertices = {
				a: intersects[0].object.geometry.vertices[ver.a],
				b: intersects[0].object.geometry.vertices[ver.b],
				c: intersects[0].object.geometry.vertices[ver.c],
			}

			vertices.a.add(dir);
			vertices.b.add(dir);
			vertices.c.add(dir);
			intersects[0].object.geometry.verticesNeedUpdate = true;
		
			synth.playOsc(ver.a, vertices.a.distanceTo(scene.position), vertices.b.z, vertices.a.distanceTo(scene.position) / 10000, vertices.c.y);
		}
	}

}

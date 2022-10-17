function loadOBJ(renderer, path, name, objMaterial, transform) {
	return new Promise(resolve => {
		const manager = new THREE.LoadingManager();
		manager.onProgress = function (item, loaded, total) {
			console.log(item, loaded, total);
		};

		function onProgress(xhr) {
			if (xhr.lengthComputable) {
				const percentComplete = xhr.loaded / xhr.total * 100;
				console.log('model ' + Math.round(percentComplete, 2) + '% downloaded');
			}
		}
		function onError() { }

		new THREE.MTLLoader(manager)
			.setPath(path)
			.load(name + '.mtl', function (materials) {
				materials.preload();
				new THREE.OBJLoader(manager)
					.setMaterials(materials)
					.setPath(path)
					.load(name + '.obj', function (object) {
						object.traverse(async function (child) {
							if (child.isMesh) {
								let geo = child.geometry;
								let mat;
								if (Array.isArray(child.material)) mat = child.material[0];
								else mat = child.material;

								var indices = Array.from({ length: geo.attributes.position.count }, (v, k) => k);
								let mesh = new Mesh({ name: 'aVertexPosition', array: geo.attributes.position.array },
									{ name: 'aNormalPosition', array: geo.attributes.normal.array },
									{ name: 'aTextureCoord', array: geo.attributes.uv.array },
									indices, transform);

								let colorMap = new Texture();
								if (mat.map != null) {
									await waitUntilTextureIsLoad(mat.map);
									colorMap.CreateImageTexture(renderer.gl, mat.map.image);
								}
								else {
									colorMap.CreateConstantTexture(renderer.gl, mat.color.toArray());
								}

								let material, shadowMaterial;
								let Translation = [transform.modelTransX, transform.modelTransY, transform.modelTransZ];
								let Scale = [transform.modelScaleX, transform.modelScaleY, transform.modelScaleZ];

								let light = renderer.lights[0].entity;
								switch (objMaterial) {
									case 'PhongMaterial':
										material = buildPhongMaterial(colorMap, mat.specular.toArray(), light, Translation, Scale, "./src/shaders/phongShader/phongVertex.glsl", "./src/shaders/phongShader/phongFragment.glsl");
										shadowMaterial = buildShadowMaterial(light, Translation, Scale, "./src/shaders/shadowShader/shadowVertex.glsl", "./src/shaders/shadowShader/shadowFragment.glsl");
										break;
								}

								material.then((data) => {
									let meshRender = new MeshRender(renderer.gl, mesh, data);
									renderer.addMeshRender(meshRender);
								});
								shadowMaterial.then((data) => {
									let shadowMeshRender = new MeshRender(renderer.gl, mesh, data);
									renderer.addShadowMeshRender(shadowMeshRender);
								});
							}
						});
						resolve();
					}, onProgress, onError);
			});
	});
}

function waitUntilTextureIsLoad(map) {
	return new Promise(resolve => {
		let timer;
		if (map != null) {
			timer = setInterval(() => {
				if (map.image != null) {
					clearInterval(timer);
					resolve();
				}
			}, 50);
		}
	});
}

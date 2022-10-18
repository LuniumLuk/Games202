function getRotationPrecomputeL(precomputeL, rotationMatrix){
	const L = JSON.parse(JSON.stringify(precomputeL));
	const M3x3 = computeSquareMatrix_3by3(rotationMatrix);
	const M5x5 = computeSquareMatrix_5by5(rotationMatrix);

	let newPrecomputeL = [];
	for (let i = 0; i < 3; i++) {
		let band1 = math.multiply(M3x3, getBand1(L[i]));
		let band2 = math.multiply(M5x5, getBand2(L[i]));
		newPrecomputeL.push([
			L[i][0],
			band1._data[0],
			band1._data[1],
			band1._data[2],
			band2._data[0],
			band2._data[1],
			band2._data[2],
			band2._data[3],
			band2._data[4],
		]);
	}

	return newPrecomputeL;
}

function getBand1(L) {
	return math.matrix([
		L[1],
		L[2],
		L[3],
	]);
}

function getBand2(L) {
	return math.matrix([
		L[4],
		L[5],
		L[6],
		L[7],
		L[8],
	]);
}

function computeSquareMatrix_3by3(rotationMatrix){ // 计算方阵SA(-1) 3*3 
	
	// 1、pick ni - {ni}
	let n1 = [1, 0, 0, 0]; let n2 = [0, 0, 1, 0]; let n3 = [0, 1, 0, 0];
	
	// 2、{P(ni)} - A  A_inverse
	let sh1 = SHEval(n1[0], n1[1], n1[2], 3)
	let sh2 = SHEval(n2[0], n2[1], n2[2], 3)
	let sh3 = SHEval(n3[0], n3[1], n3[2], 3)
	let A = math.matrix([sh1.slice(1, 4), sh2.slice(1, 4), sh3.slice(1, 4)]);
	A = math.transpose(A);
	let invA = math.inv(A);

	// 3、用 R 旋转 ni - {R(ni)}
	let rMatrix = mat4Matrix2mathMatrix(rotationMatrix);
	rMatrix = math.transpose(rMatrix);
	let rn1 = math.multiply(rMatrix, n1);
	let rn2 = math.multiply(rMatrix, n2);
	let rn3 = math.multiply(rMatrix, n3);

	// 4、R(ni) SH投影 - S
	let shr1 = SHEval(rn1._data[0], rn1._data[1], rn1._data[2], 3)
	let shr2 = SHEval(rn2._data[0], rn2._data[1], rn2._data[2], 3)
	let shr3 = SHEval(rn3._data[0], rn3._data[1], rn3._data[2], 3)
	let S = math.matrix([shr1.slice(1, 4), shr2.slice(1, 4), shr3.slice(1, 4)]);
	S = math.transpose(S);

	// 5、S*A_inverse
	return math.multiply(S, invA);
}

function computeSquareMatrix_5by5(rotationMatrix){ // 计算方阵SA(-1) 5*5
	
	// 1、pick ni - {ni}
	let k = 1 / math.sqrt(2);
	let n1 = [1, 0, 0, 0]; let n2 = [0, 0, 1, 0]; let n3 = [k, k, 0, 0]; 
	let n4 = [k, 0, k, 0]; let n5 = [0, k, k, 0];

	// 2、{P(ni)} - A  A_inverse
	let sh1 = SHEval(n1[0], n1[1], n1[2], 3)
	let sh2 = SHEval(n2[0], n2[1], n2[2], 3)
	let sh3 = SHEval(n3[0], n3[1], n3[2], 3)
	let sh4 = SHEval(n4[0], n4[1], n4[2], 3)
	let sh5 = SHEval(n5[0], n5[1], n5[2], 3)
	let A = math.matrix([
		sh1.slice(4, 9),
		sh2.slice(4, 9),
		sh3.slice(4, 9),
		sh4.slice(4, 9),
		sh5.slice(4, 9),
	]);
	A = math.transpose(A);
	let invA = math.inv(A);

	// 3、用 R 旋转 ni - {R(ni)}
	let rMatrix = mat4Matrix2mathMatrix(rotationMatrix);
	rMatrix = math.transpose(rMatrix);
	let rn1 = math.multiply(rMatrix, n1);
	let rn2 = math.multiply(rMatrix, n2);
	let rn3 = math.multiply(rMatrix, n3);
	let rn4 = math.multiply(rMatrix, n4);
	let rn5 = math.multiply(rMatrix, n5);

	// 4、R(ni) SH投影 - S
	let shr1 = SHEval(rn1._data[0], rn1._data[1], rn1._data[2], 3)
	let shr2 = SHEval(rn2._data[0], rn2._data[1], rn2._data[2], 3)
	let shr3 = SHEval(rn3._data[0], rn3._data[1], rn3._data[2], 3)
	let shr4 = SHEval(rn4._data[0], rn4._data[1], rn4._data[2], 3)
	let shr5 = SHEval(rn5._data[0], rn5._data[1], rn5._data[2], 3)
	let S = math.matrix([
		shr1.slice(4, 9),
		shr2.slice(4, 9),
		shr3.slice(4, 9),
		shr4.slice(4, 9),
		shr5.slice(4, 9),
	]);
	S = math.transpose(S);

	// 5、S*A_inverse
	return math.multiply(S, invA);

}

function mat4Matrix2mathMatrix(rotationMatrix){

	let mathMatrix = [];
	for(let i = 0; i < 4; i++){
		let r = [];
		for(let j = 0; j < 4; j++){
			r.push(rotationMatrix[i*4+j]);
		}
		mathMatrix.push(r);
	}
	return math.matrix(mathMatrix)

}

function getMat3ValueFromRGB(precomputeL){

    let colorMat3 = [];
    for(var i = 0; i<3; i++){
        colorMat3[i] = mat3.fromValues( precomputeL[0][i], precomputeL[1][i], precomputeL[2][i],
										precomputeL[3][i], precomputeL[4][i], precomputeL[5][i],
										precomputeL[6][i], precomputeL[7][i], precomputeL[8][i] ); 
	}
    return colorMat3;
}
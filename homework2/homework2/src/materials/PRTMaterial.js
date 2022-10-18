class PRTMaterial extends Material {

    constructor(vertexShader, fragmentShader) {
        super({
            'uPrecomputeLR': { type: 'matrix3fv', value: 'R' },
            'uPrecomputeLG': { type: 'matrix3fv', value: 'G' },
            'uPrecomputeLB': { type: 'matrix3fv', value: 'B' },
        }, [
            'aPrecomputeLT'
        ], vertexShader, fragmentShader, null);
    }
}

async function buildPRTMaterial(vertexPath, fragmentPath) {

    let vertexShader = await getShaderString(vertexPath);
    let fragmentShader = await getShaderString(fragmentPath);

    return new PRTMaterial(vertexShader, fragmentShader);

}
class EmissiveMaterial extends Material {

    constructor(lightIntensity, lightColor) {    
        super({
            'uLightIntensity': { type: '1f', value: lightIntensity },
            'uLightColor': { type: '3fv', value: lightColor }
        }, [], LightCubeVertexShader, LightCubeFragmentShader);
        
        this.intensity = lightIntensity;
        this.color = lightColor;
    }
}

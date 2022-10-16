class Material {
    #flatten_uniforms;
    #flatten_attribs;
    #vsSrc;
    #fsSrc;
    // Uniforms is a map, attribs is a Array
    constructor(uniforms, attribs, vsSrc, fsSrc) {
        this.uniforms = uniforms;
        this.attribs = attribs;
        this.#vsSrc = vsSrc;
        this.#fsSrc = fsSrc;
        
        this.#flatten_uniforms = ['uModelViewMatrix', 'uProjectionMatrix', 'uCameraPos', 'uLightPos'];
        for (let k in uniforms) {
            this.#flatten_uniforms.push(k);
        }
        this.#flatten_attribs = attribs;
    }

    setMeshAttribs(extraAttribs) {
        for (let i = 0; i < extraAttribs.length; i++) {
            this.#flatten_attribs.push(extraAttribs[i]);
        }
    }

    compile(gl) {
        return new Shader(gl, this.#vsSrc, this.#fsSrc,
            {
                uniforms: this.#flatten_uniforms,
                attribs: this.#flatten_attribs
            });
    }
}

function fetchCode(path) {
    return new Promise((resolve, reject) => {
        fetch(path).then(response => {
            return response.text();
        }).then(data => {
            resolve(data);
        }).catch(err => {
            reject(err);
        });
    });
}

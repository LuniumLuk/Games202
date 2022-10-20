#ifdef GL_ES
precision highp float;
#endif

uniform vec3 uLightDir;
uniform vec3 uCameraPos;
uniform vec3 uLightRadiance;
uniform sampler2D uGDiffuse;
uniform sampler2D uGDepth;
uniform sampler2D uGNormalWorld;
uniform sampler2D uGShadow;
uniform sampler2D uGPosWorld;

varying mat4 vWorldToScreen;
varying highp vec4 vPosWorld;

#define M_PI 3.1415926535897932384626433832795
#define TWO_PI 6.283185307
#define INV_PI 0.31830988618
#define INV_TWO_PI 0.15915494309

float Rand1(inout float p) {
  p = fract(p * .1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

vec2 Rand2(inout float p) {
  return vec2(Rand1(p), Rand1(p));
}

float InitRand(vec2 uv) {
	vec3 p3  = fract(vec3(uv.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec3 SampleHemisphereUniform(inout float s, out float pdf) {
  vec2 uv = Rand2(s);
  float z = uv.x;
  float phi = uv.y * TWO_PI;
  float sinTheta = sqrt(1.0 - z*z);
  vec3 dir = vec3(sinTheta * cos(phi), sinTheta * sin(phi), z);
  pdf = INV_TWO_PI;
  return dir;
}

vec3 SampleHemisphereCos(inout float s, out float pdf) {
  vec2 uv = Rand2(s);
  float z = sqrt(1.0 - uv.x);
  float phi = uv.y * TWO_PI;
  float sinTheta = sqrt(uv.x);
  vec3 dir = vec3(sinTheta * cos(phi), sinTheta * sin(phi), z);
  pdf = z * INV_PI;
  return dir;
}

void LocalBasis(vec3 n, out vec3 b1, out vec3 b2) {
  float sign_ = sign(n.z);
  if (n.z == 0.0) {
    sign_ = 1.0;
  }
  float a = -1.0 / (sign_ + n.z);
  float b = n.x * n.y * a;
  b1 = vec3(1.0 + sign_ * n.x * n.x * a, sign_ * b, -sign_ * n.x);
  b2 = vec3(b, sign_ + n.y * n.y * a, -n.y);
}

vec4 Project(vec4 a) {
  return a / a.w;
}

float GetDepth(vec3 posWorld) {
  float depth = (vWorldToScreen * vec4(posWorld, 1.0)).w;
  return depth;
}

/*
 * Transform point from world space to screen space([0, 1] x [0, 1])
 *
 */
vec2 GetScreenCoordinate(vec3 posWorld) {
  vec2 uv = Project(vWorldToScreen * vec4(posWorld, 1.0)).xy * 0.5 + 0.5;
  return uv;
}

float GetGBufferDepth(vec2 uv) {
  float depth = texture2D(uGDepth, uv).x;
  // if (depth < 1e-2) {
  //   depth = 1000.0;
  // }
  // Notice:
  // modifying here since I changed the far/near of the camera
  if (depth < 1.0) {
    depth = 100.0;
  }
  return depth;
}

vec3 GetGBufferNormalWorld(vec2 uv) {
  vec3 normal = texture2D(uGNormalWorld, uv).xyz;
  return normal;
}

vec3 GetGBufferPosWorld(vec2 uv) {
  vec3 posWorld = texture2D(uGPosWorld, uv).xyz;
  return posWorld;
}

float GetGBufferuShadow(vec2 uv) {
  float visibility = texture2D(uGShadow, uv).x;
  return visibility;
}

vec3 GetGBufferDiffuse(vec2 uv) {
  vec3 diffuse = texture2D(uGDiffuse, uv).xyz;
  diffuse = pow(diffuse, vec3(2.2));
  return diffuse;
}

/*
 * Evaluate diffuse bsdf value.
 *
 * wi, wo are all in world space.
 * uv is in screen space, [0, 1] x [0, 1].
 *
 */
vec3 EvalDiffuse(vec3 wi, vec3 wo, vec2 uv) {
  vec3 L = GetGBufferDiffuse(uv);
  vec3 N = normalize(GetGBufferNormalWorld(uv));
  wi = normalize(wi);
  float cosi = max(dot(wi, N), 0.0);
  float coso = max(sign(dot(wo, N)), 0.0);
  return L * cosi * coso / M_PI;
}

/*
 * Evaluate directional light with shadow map
 * uv is in screen space, [0, 1] x [0, 1].
 *
 */
vec3 EvalDirectionalLight(vec2 uv) {
  vec3 Le = uLightRadiance;
  float visibility = GetGBufferuShadow(uv);

  // vec3 L = normalize(uLightDir);
  // vec3 N = GetGBufferNormalWorld(uv);
  return Le * visibility;
}

const int maxIter = 100;
const float minStep = 0.01;
bool RayMarch(vec3 ori, vec3 dir, out vec3 hitPos) {
  // simple ray march with unifrom step size
  float step = 1.0;
  float t = 0.1;
  vec3 P;
  for (int i = 0; i < maxIter; i++) {
    P = ori + dir * t;
    float currentDepth = GetDepth(P);
    if (currentDepth < 0.0 || currentDepth > 100.0) {
      return false;
    }
    vec2 uv = GetScreenCoordinate(P);
    if (uv.x < 0.0 || uv.x > 1.0 
     || uv.y < 0.0 || uv.y > 1.0) {
      return false;
    }
    float sceneDepth = GetGBufferDepth(uv);
    if (currentDepth > sceneDepth) {
      if (step < minStep) {
        hitPos = GetGBufferPosWorld(uv);
        return true;
      }
      t -= step;
      step /= 2.0;
    }
    t += step;
  }

  return false;
}

#define SAMPLE_NUM 8

void main() {
  float s = InitRand(gl_FragCoord.xy);

  vec2 UV = GetScreenCoordinate(vPosWorld.xyz);
  vec3 radiance = EvalDirectionalLight(UV);
  vec3 albedo = GetGBufferDiffuse(UV);
  vec3 V = normalize(uCameraPos - vPosWorld.xyz);
  vec3 ambient = vec3(0.05) * albedo;
  vec3 L = normalize(uLightDir);
  vec3 bsdf = EvalDiffuse(L, V, UV);

  vec3 LDir = bsdf * radiance;
  vec3 LIndir = vec3(0.0);

  vec3 N = GetGBufferNormalWorld(UV);
  vec3 T, B;
  LocalBasis(N, T, B);
  for (int i = 0; i < SAMPLE_NUM; i++) {
    float pdf = 1.0;
    // Test: all sample from specular reflection
    // vec3 dir = reflect(-V, N);

    // Sample Uniform
    vec3 dir = SampleHemisphereUniform(s, pdf);
    dir = mat3(T, B, N) * dir;

    dir = normalize(dir);
    vec3 hitPos;
    if (RayMarch(vPosWorld.xyz, dir, hitPos)) {
      float dist = length(hitPos - vPosWorld.xyz);
      float attenuation = min(1.0 / dist / dist, 1.0);
      vec2 hitUV = GetScreenCoordinate(hitPos);
      dir = normalize(hitPos - vPosWorld.xyz);
      vec3 bsdf0 = EvalDiffuse(dir, V, UV);
      vec3 bsdf1 = EvalDiffuse(L, -dir, hitUV);
      vec3 radiance1 = EvalDirectionalLight(hitUV);
      LIndir += attenuation * bsdf0 / pdf * bsdf1 * radiance1;
    }
  }
  LIndir /= float(SAMPLE_NUM);

  vec3 color = LDir + LIndir;
  // vec3 color = LIndir;
  // vec3 color = LIndir * 10.0 + ambient;
  color = clamp(color, vec3(0.0), vec3(1.0));
  color = pow(color, vec3(1.0/2.0));
  gl_FragColor = vec4(vec3(color.rgb), 1.0);
}

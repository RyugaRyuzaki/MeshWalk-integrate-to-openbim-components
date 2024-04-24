import * as THREE from "three";
export interface ILightSettings {
  skylight: {
    /**
     * Skylight sky Color.
     * Default: THREE.Color(153, 204, 255)
     */
    skyColor: THREE.Color;

    /**
     * Skylight ground color.
     * Default: THREE.Color(242, 213, 181)
     */
    groundColor: THREE.Color;

    /**
     * Skylight intensity.
     * Default: 0.8
     */
    intensity: number;
  };
  /**
   * Sunlight (directional light) options
   * Two Blue-Green lights at odd angles. See defaultViewerSettings.
   */
  sunLights: {
    /** Light position. */
    position: THREE.Vector3;
    /** Light color. */
    color: THREE.Color;
    /** Light intensity. */
    intensity: number;
  }[];
}

export class Stream {
  constructor({ id, name, F = 0, T = 298.15, P = 101, z = 0.5, phase = "L" }) {
    this.id = id; this.name = name || id;
    this.F = +F; this.T = +T; this.P = +P; this.z = +z; this.phase = phase;
  }
}

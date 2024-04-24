class SoundEffect {

  context = new AudioContext();
  audioBuffer: AudioBuffer | null = null;

  async load( url: string ) {

    const response = await fetch( url );
    const arrayBuffer = await response.arrayBuffer();
    this.audioBuffer = await this.context.decodeAudioData( arrayBuffer );

  }

  play() {

    if ( ! this.audioBuffer ) { return; }
    const source = this.context.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect( this.context.destination );
    source.start( 0 );

  }

}

export const horn = new SoundEffect();
horn.load( './horn.mp3' );

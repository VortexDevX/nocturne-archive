declare module "epub2" {
  interface EpubMetadata {
    title?: string;
    creator?: string;
    description?: string;
    publisher?: string;
    language?: string;
    [key: string]: any;
  }

  interface EpubChapter {
    id: string;
    title?: string;
    order?: number;
    [key: string]: any;
  }

  class EPub {
    constructor(
      epubPath: string,
      imageWebRoot?: string,
      chapterWebRoot?: string
    );

    metadata: EpubMetadata;
    flow: EpubChapter[];

    parse(): void;
    getChapter(
      chapterId: string,
      callback: (error: Error | null, text: string) => void
    ): void;
    getImage(
      imageId: string,
      callback: (error: Error | null, data: Buffer, mimeType: string) => void
    ): void;

    on(event: "end", listener: () => void): this;
    on(event: "error", listener: (error: Error) => void): this;
  }

  export = EPub;
}

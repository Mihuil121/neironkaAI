declare module 'node-scrapy' {
  interface ScrapyModel {
    [key: string]: {
      selector: string;
      type: string;
      attribute?: string;
      data?: ScrapyModel;
    };
  }

  interface Scrapy {
    scrape(url: string, model: ScrapyModel): Promise<any>;
  }

  const Scrapy: Scrapy;
  export default Scrapy;
} 
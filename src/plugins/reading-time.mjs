import { readingTime } from 'reading-time-estimator';
import { toString } from 'mdast-util-to-string';

const WPM = 230;

export function remarkReadingTime() {
  return function (tree, { data }) {
    const textOnPage = toString(tree);
    const time = readingTime(textOnPage, WPM);
    // readingTime.text will give us minutes read as a friendly string,
    // i.e. "3 min read"
    data.astro.frontmatter.minutesRead = time.text;
  };
}

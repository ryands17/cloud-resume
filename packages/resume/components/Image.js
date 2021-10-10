import NextImage from 'next/image'

const customImageLoader = ({ src, width, quality }) => {
  return `${src}?w=${width}&q=${quality || 75}`
}

// eslint-disable-next-line jsx-a11y/alt-text
const Image = ({ ...rest }) => (
  <NextImage {...rest} loader={customImageLoader} />
)

export default Image

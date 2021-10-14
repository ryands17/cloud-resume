const ONE_DAY = 86400
const ONE_WEEK = ONE_DAY * 7

const handler = async (event) => {
  const { request, response } = event.Records[0].cf

  if (request.uri.includes('/_next/static/')) {
    response.headers['Cache-Control'] = [{ value: `max-age=${ONE_WEEK}` }]
  } else {
    response.headers['Cache-Control'] = [{ value: `max-age=${ONE_DAY}` }]
  }

  return response
}

exports.handler = handler

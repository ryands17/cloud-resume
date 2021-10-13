const handler = async (event) => {
  const { request, response } = event.Records[0].cf
  const ONE_WEEK = 86400 * 7

  if (request.uri.includes('/_next/static/')) {
    response.headers['Cache-Control'] = [{ value: `max-age=${ONE_WEEK}` }]
  }

  return response
}

exports.handler = handler

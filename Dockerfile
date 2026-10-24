FROM nginx:1.30.6-alpine@sha256:47928bf67eb62a1863cb08d9ecb52d3e704304ba614eaee17884204677702951

ARG VERSION=dev
ARG REVISION=unknown
LABEL org.opencontainers.image.source="https://github.com/oberones/virtual-soundforge" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.revision="${REVISION}"

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
# Use a separate document root so nginx's bundled welcome/error pages are not served.
COPY index.html details.html index.css favicon.ico gpl.txt /srv/virtual-soundforge/
COPY src/ /srv/virtual-soundforge/src/

EXPOSE 80

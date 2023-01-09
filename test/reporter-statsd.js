/**
* Requires a working StatsD server running
* This can be set up with
*
* @example Setup local StatsD server
* docker \
*   run \
*   -d \
*   --name=graphite \
*   --restart=always \
*   --publish=80:80 \
*   --publish=2003-2004:2003-2004 \
*   --publish=2023-2024:2023-2024 \
*   --publish=8125:8125/udp \
*   --publish=8126:8126 \
*   graphiteapp/graphite-statsd
*
* @example Follow the logs of the container
* docker logs -f graphite
*/

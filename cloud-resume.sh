#!/bin/bash

### BEGIN INIT INFO
# Provides:          cloud-resume
# Required-Start:    $remote_fs $syslog
# Required-Stop:     $remote_fs $syslog
# Default-Start:     2 3 4 5
# Default-Stop:      0 1 6
# Short-Description: Cloud resume project
# Description:       Execute docker compose at startup
### END INIT INFO

cd /app/projects/cloud-resume
docker compose up -d
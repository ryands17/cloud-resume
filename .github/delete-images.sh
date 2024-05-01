#!/bin/bash

# delete dangling docker images 
docker rmi $(docker images --filter "dangling=true" --format "{{.ID}}")

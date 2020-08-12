#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cdk = require("@aws-cdk/core");
const sos_initiative_stack_1 = require("../lib/stacks/sos-initiative-stack");
const app = new cdk.App();
new sos_initiative_stack_1.SoslebanonInitiativeStack(app, 'SoslebanonInitiativeStack');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic29zLWluaXRpYXRpdmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzb3MtaW5pdGlhdGl2ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFDQSxxQ0FBcUM7QUFDckMsNkVBQStFO0FBRS9FLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLElBQUksZ0RBQXlCLENBQUMsR0FBRyxFQUFFLDJCQUEyQixDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXHJcbmltcG9ydCAqIGFzIGNkayBmcm9tICdAYXdzLWNkay9jb3JlJztcclxuaW1wb3J0IHsgU29zbGViYW5vbkluaXRpYXRpdmVTdGFjayB9IGZyb20gJy4uL2xpYi9zdGFja3Mvc29zLWluaXRpYXRpdmUtc3RhY2snO1xyXG5cclxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcclxubmV3IFNvc2xlYmFub25Jbml0aWF0aXZlU3RhY2soYXBwLCAnU29zbGViYW5vbkluaXRpYXRpdmVTdGFjaycpO1xyXG4iXX0=
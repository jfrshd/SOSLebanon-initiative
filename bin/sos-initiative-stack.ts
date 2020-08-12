#!/usr/bin/env node
import * as cdk from '@aws-cdk/core';
import { SoslebanonInitiativeStack } from '../lib/stacks/sos-initiative-stack';

const app = new cdk.App();
new SoslebanonInitiativeStack(app, 'SoslebanonInitiativeStack');

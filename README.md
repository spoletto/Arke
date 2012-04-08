Arke: An in-browser implementation of MapReduce
===============

Arke is a JavaScript implementation of Google’s MapReduce. Rather than running on a fixed cluster in a data center like most distributed computational frameworks, Arke relies on the computing power of individual browsers across the open Internet. Volunteers connect to Arke’s web application, offering their web browser engine as a worker in the system. Further, Arke is a service; users may upload jobs and data conforming to a simple specification in order to delegate their computation to a dynamic cloud of volunteer nodes.

Arke was implemented by Peter Wilmot, James Sedgwick and Stephen Poletto in the fall of 2011. A report of Arke's performance can be downloaded [here](https://github.com/spoletto/Arke/blob/master/Arke.pdf?raw=true).